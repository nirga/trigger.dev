import { FetchOutput } from "@trigger.dev/common-schemas";
import {
  HostRPCSchema,
  Logger,
  ServerRPCSchema,
  ZodRPC,
} from "internal-bridge";
import { v4 } from "uuid";
import { WebSocket } from "ws";
import { z } from "zod";
import * as pkg from "../package.json";
import { HostConnection, TimeoutError } from "./connection";
import { triggerRunLocalStorage } from "./localStorage";
import { ContextLogger } from "./logger";
import { Trigger, TriggerOptions } from "./trigger";
import { TriggerContext, TriggerFetch } from "./types";
import { generateErrorMessage, ErrorMessageOptions } from "zod-error";
import terminalLink from "terminal-link";
import chalk from "chalk";

const zodErrorMessageOptions: ErrorMessageOptions = {
  delimiter: {
    error: " 🔥 ",
  },
};

type RunOnceOutput = { idempotencyKey: string; hasRun: boolean; output?: any };

export class TriggerClient<TSchema extends z.ZodTypeAny> {
  #trigger: Trigger<TSchema>;
  #options: TriggerOptions<TSchema>;

  #connection?: HostConnection;
  #serverRPC?: ZodRPC<typeof ServerRPCSchema, typeof HostRPCSchema>;

  #apiKey: string;
  #endpoint: string;

  #isConnected = false;
  #retryIntervalMs: number = 3_000;
  #logger: Logger;
  #closedByUser = false;

  #registerResponse?: {
    workflow: {
      id: string;
      slug: string;
    };
    environment: {
      id: string;
      slug: string;
    };
    organization: {
      id: string;
      slug: string;
    };
    isNew: boolean;
    url: string;
  };

  #responseCompleteCallbacks = new Map<
    string,
    {
      resolve: (output: any) => void;
      reject: (err?: any) => void;
    }
  >();

  #waitForCallbacks = new Map<
    string,
    {
      resolve: () => void;
      reject: (err?: any) => void;
    }
  >();

  #fetchCallbacks = new Map<
    string,
    {
      resolve: (output: FetchOutput) => void;
      reject: (err?: any) => void;
    }
  >();

  #runOnceCallbacks = new Map<
    string,
    {
      resolve: (output: RunOnceOutput) => void;
      reject: (err?: any) => void;
    }
  >();

  constructor(trigger: Trigger<TSchema>, options: TriggerOptions<TSchema>) {
    this.#trigger = trigger;
    this.#options = options;

    const apiKey = this.#options.apiKey ?? process.env.TRIGGER_API_KEY;

    if (!apiKey) {
      throw new Error(
        "Cannot connect to Trigger because of invalid API Key: Please include an API Key in the `apiKey` option or in the `TRIGGER_API_KEY` environment variable."
      );
    }

    this.#apiKey = apiKey;
    this.#endpoint =
      this.#options.endpoint ??
      process.env.TRIGGER_WSS_URL ??
      "wss://wss.trigger.dev/ws";
    this.#logger = new Logger(
      ["trigger.dev", this.#options.id],
      this.#options.logLevel
    );
  }

  async listen(instanceId?: string) {
    try {
      await this.#initializeConnection(instanceId);
      this.#initializeRPC();
      await this.#initializeHost();

      if (this.#registerResponse?.isNew) {
        this.#logger.logClean(
          `🎉 Successfully registered "${
            this.#trigger.name
          }" to trigger.dev 👉 ${terminalLink(
            "View on dashboard",
            this.#registerResponse.url,
            { fallback: (text, url) => `${text}: (${url})` }
          )}. Listening for events...`
        );
      } else {
        this.#logger.log(
          `✨ Connected and listening for events 👉 ${terminalLink(
            "View on dashboard",
            this.#registerResponse!.url,
            { fallback: (text, url) => `${text}: (${url})` }
          )}`
        );
      }
    } catch (error) {
      this.#logger.log(`🚩 Could not connect to trigger.dev`);

      this.close();
    }
  }

  close() {
    this.#closedByUser = true;

    if (this.#serverRPC) {
      this.#serverRPC = undefined;
    }

    this.#connection?.close();
    this.#isConnected = false;
  }

  async #initializeConnection(instanceId?: string) {
    const id = instanceId ?? v4();

    this.#logger.debug("Initializing connection", {
      id,
      endpoint: this.#endpoint,
    });

    const headers = { Authorization: `Bearer ${this.#apiKey}` };

    const connection = new HostConnection(
      new WebSocket(this.#endpoint, {
        headers,
        followRedirects: true,
      }),
      { id }
    );

    connection.onClose.attach(async ([code, reason]) => {
      if (this.#closedByUser) {
        this.#logger.debug("Connection closed by user, so we won't reconnect");
        this.#closedByUser = false;
        return;
      }

      this.#logger.error(
        `${chalk.red("error")} Could not connect to trigger.dev${
          reason ? `: ${reason}` : `(code ${code})`
        }`
      );

      // If #isConnected is already false, that means we are already trying to reconnect
      if (!this.#isConnected) return;

      this.#logger.log("🔌 Reconnecting to trigger.dev...");

      this.#isConnected = false;

      while (!this.#isConnected) {
        this.#initializeConnection(id)
          .then(() => {
            this.#logger.log("⚡ Reconnection successful");
          })
          .catch(() => {});

        this.#logger.debug(
          `Reconnection failed, retrying in ${Math.round(
            this.#retryIntervalMs / 1000
          )} seconds`,
          id
        );

        await new Promise((resolve) =>
          setTimeout(resolve, this.#retryIntervalMs)
        );
      }
    });

    await connection.connect();

    this.#logger.debug("Connection initialized", id);

    this.#connection = connection;
    this.#isConnected = true;

    if (this.#serverRPC) {
      this.#serverRPC.resetConnection(connection);
      await this.#initializeHost();
    }
  }

  async #initializeRPC() {
    if (!this.#connection) {
      throw new Error("Cannot initialize RPC without a connection");
    }

    const serverRPC = new ZodRPC({
      connection: this.#connection,
      sender: ServerRPCSchema,
      receiver: HostRPCSchema,
      handlers: {
        RESOLVE_DELAY: async (data) => {
          this.#logger.debug("Handling RESOLVE_DELAY", data);

          const waitCallbacks = this.#waitForCallbacks.get(
            messageKey(data.meta.runId, data.key)
          );

          if (!waitCallbacks) {
            this.#logger.debug(
              `Could not find wait callbacks for wait ID ${messageKey(
                data.meta.runId,
                data.key
              )}. This can happen when a workflow run is resumed`
            );

            return true;
          }

          const { resolve } = waitCallbacks;

          resolve();

          return true;
        },
        RESOLVE_RUN_ONCE: async (data) => {
          this.#logger.debug("Handling RESOLVE_RUN_ONCE", data);

          const runOnceCallbacks = this.#runOnceCallbacks.get(
            messageKey(data.meta.runId, data.key)
          );

          if (!runOnceCallbacks) {
            this.#logger.debug(
              `Could not find runOnce callbacks for request ID ${messageKey(
                data.meta.runId,
                data.key
              )}. This can happen when a workflow run is resumed`
            );

            return true;
          }

          const { resolve } = runOnceCallbacks;

          resolve(data.output);

          return true;
        },
        RESOLVE_REQUEST: async (data) => {
          this.#logger.debug("Handling RESOLVE_REQUEST", data);

          const requestCallbacks = this.#responseCompleteCallbacks.get(
            messageKey(data.meta.runId, data.key)
          );

          if (!requestCallbacks) {
            this.#logger.debug(
              `Could not find request callbacks for request ID ${messageKey(
                data.meta.runId,
                data.key
              )}. This can happen when a workflow run is resumed`
            );

            return true;
          }

          const { resolve } = requestCallbacks;

          resolve(data.output);

          return true;
        },
        REJECT_REQUEST: async (data) => {
          this.#logger.debug("Handling REJECT_REQUEST", data);

          const requestCallbacks = this.#responseCompleteCallbacks.get(
            messageKey(data.meta.runId, data.key)
          );

          if (!requestCallbacks) {
            this.#logger.debug(
              `Could not find request callbacks for request ID ${messageKey(
                data.meta.runId,
                data.key
              )}. This can happen when a workflow run is resumed`
            );

            return true;
          }

          const { reject } = requestCallbacks;

          reject(data.error);

          return true;
        },
        RESOLVE_FETCH_REQUEST: async (data) => {
          this.#logger.debug("Handling RESOLVE_FETCH_REQUEST", data);

          const fetchCallbacks = this.#fetchCallbacks.get(
            messageKey(data.meta.runId, data.key)
          );

          if (!fetchCallbacks) {
            this.#logger.debug(
              `Could not find fetch callbacks for request ID ${messageKey(
                data.meta.runId,
                data.key
              )}. This can happen when a workflow run is resumed`
            );

            return true;
          }

          const { resolve } = fetchCallbacks;

          resolve(data.output);

          return true;
        },
        REJECT_FETCH_REQUEST: async (data) => {
          this.#logger.debug("Handling REJECT_FETCH_REQUEST", data);

          const fetchCallbacks = this.#fetchCallbacks.get(
            messageKey(data.meta.runId, data.key)
          );

          if (!fetchCallbacks) {
            this.#logger.debug(
              `Could not find fetch callbacks for request ID ${messageKey(
                data.meta.runId,
                data.key
              )}. This can happen when a workflow run is resumed`
            );

            return true;
          }

          const { reject } = fetchCallbacks;

          reject(data.error);

          return true;
        },
        TRIGGER_WORKFLOW: async (data) => {
          this.#logger.debug("Handling TRIGGER_WORKFLOW", data);

          const parsedEventData = this.#options.on.schema.safeParse(
            data.trigger.input
          );

          if (!parsedEventData.success) {
            await serverRPC.send("SEND_WORKFLOW_ERROR", {
              runId: data.id,
              timestamp: String(highPrecisionTimestamp()),
              error: {
                name: "Event validation error",
                message: generateErrorMessage(
                  parsedEventData.error.issues,
                  zodErrorMessageOptions
                ),
              },
            });

            return true;
          }

          const fetchFunction: TriggerFetch = async (key, url, options) => {
            const result = new Promise<FetchOutput>((resolve, reject) => {
              this.#fetchCallbacks.set(messageKey(data.id, key), {
                resolve,
                reject,
              });
            });

            await serverRPC.send("SEND_FETCH", {
              runId: data.id,
              key,
              fetch: {
                url: url.toString(),
                method: options.method ?? "GET",
                headers: options.headers,
                body: options.body,
                retry: options.retry,
              },
              timestamp: String(highPrecisionTimestamp()),
            });

            const response = await result;

            return {
              status: response.status,
              ok: response.ok,
              headers: response.headers,
              body: response.body
                ? (options.responseSchema ?? z.any()).parse(response.body)
                : undefined,
            };
          };

          const ctx: TriggerContext = {
            id: data.id,
            environment: data.meta.environment,
            apiKey: data.meta.apiKey,
            organizationId: data.meta.organizationId,
            isTest: data.meta.isTest,
            logger: new ContextLogger(async (level, message, properties) => {
              await serverRPC.send("SEND_LOG", {
                runId: data.id,
                key: message,
                log: {
                  level,
                  message,
                  properties: JSON.stringify(properties ?? {}),
                },
                timestamp: String(highPrecisionTimestamp()),
              });
            }),
            sendEvent: async (key, event) => {
              await serverRPC.send("SEND_EVENT", {
                runId: data.id,
                key,
                event: JSON.parse(JSON.stringify(event)),
                timestamp: String(highPrecisionTimestamp()),
              });
            },
            waitFor: async (key, options) => {
              const result = new Promise<void>((resolve, reject) => {
                this.#waitForCallbacks.set(messageKey(data.id, key), {
                  resolve,
                  reject,
                });
              });

              await serverRPC.send("INITIALIZE_DELAY", {
                runId: data.id,
                key,
                wait: {
                  type: "DELAY",
                  seconds: options.seconds,
                  minutes: options.minutes,
                  hours: options.hours,
                  days: options.days,
                },
                timestamp: String(highPrecisionTimestamp()),
              });

              await result;

              return;
            },
            waitUntil: async (key, date: Date) => {
              const result = new Promise<void>((resolve, reject) => {
                this.#waitForCallbacks.set(messageKey(data.id, key), {
                  resolve,
                  reject,
                });
              });

              await serverRPC.send("INITIALIZE_DELAY", {
                runId: data.id,
                key,
                wait: {
                  type: "SCHEDULE_FOR",
                  scheduledFor: date.toISOString(),
                },
                timestamp: String(highPrecisionTimestamp()),
              });

              await result;

              return;
            },
            runOnce: async (key, callback) => {
              const result = new Promise<RunOnceOutput>((resolve, reject) => {
                this.#runOnceCallbacks.set(messageKey(data.id, key), {
                  resolve,
                  reject,
                });
              });

              await serverRPC.send("INITIALIZE_RUN_ONCE", {
                runId: data.id,
                key,
                runOnce: {
                  type: "REMOTE",
                },
                timestamp: String(highPrecisionTimestamp()),
              });

              const { idempotencyKey, hasRun, output } = await result;

              if (hasRun) {
                return output;
              }

              const callbackResult = await callback(idempotencyKey);

              await serverRPC.send("COMPLETE_RUN_ONCE", {
                runId: data.id,
                key,
                runOnce: {
                  type: "REMOTE",
                  idempotencyKey,
                  output: callbackResult
                    ? JSON.stringify(callbackResult)
                    : undefined,
                },
                timestamp: String(highPrecisionTimestamp()),
              });

              return callbackResult;
            },
            runOnceLocalOnly: async (key, callback) => {
              const result = new Promise<RunOnceOutput>((resolve, reject) => {
                this.#runOnceCallbacks.set(messageKey(data.id, key), {
                  resolve,
                  reject,
                });
              });

              await serverRPC.send("INITIALIZE_RUN_ONCE", {
                runId: data.id,
                key,
                runOnce: {
                  type: "LOCAL_ONLY",
                },
                timestamp: String(highPrecisionTimestamp()),
              });

              const { idempotencyKey } = await result;

              return callback(idempotencyKey);
            },
            fetch: fetchFunction,
          };

          const eventData = parsedEventData.data;

          this.#logger.debug("Parsed event data", eventData);

          triggerRunLocalStorage.run(
            {
              performRequest: async (key, options) => {
                const result = new Promise((resolve, reject) => {
                  this.#responseCompleteCallbacks.set(
                    messageKey(data.id, key),
                    {
                      resolve,
                      reject,
                    }
                  );
                });

                await serverRPC.send("SEND_REQUEST", {
                  runId: data.id,
                  key,
                  request: {
                    service: options.service,
                    endpoint: options.endpoint,
                    params: options.params,
                    version: options.version,
                  },
                  timestamp: String(highPrecisionTimestamp()),
                });

                const output = await result;

                if (!options.response?.schema) {
                  return output;
                }

                return options.response.schema.parse(output);
              },
              sendEvent: async (key, event) => {
                await serverRPC.send("SEND_EVENT", {
                  runId: data.id,
                  key,
                  event: JSON.parse(JSON.stringify(event)),
                  timestamp: String(highPrecisionTimestamp()),
                });
              },
              fetch: fetchFunction,
              workflowId: data.meta.workflowId,
              appOrigin: data.meta.appOrigin,
              id: data.id,
            },
            () => {
              this.#logger.debug("Running trigger...");

              if (
                typeof data.meta.attempt === "number" &&
                data.meta.attempt === 0
              ) {
                this.#logger.log(
                  `Run ${data.id} started 👉 ${terminalLink(
                    "View on dashboard",
                    `${this.#registerResponse!.url}/runs/${data.id}`,
                    { fallback: (text, url) => `${text}: (${url})` }
                  )}`
                );
              }

              serverRPC
                .send("START_WORKFLOW_RUN", {
                  runId: data.id,
                  timestamp: String(highPrecisionTimestamp()),
                })
                .then(() => {
                  return this.#trigger.options
                    .run(eventData, ctx)
                    .then((output) => {
                      this.#logger.log(
                        `Run ${data.id} complete 👉 ${terminalLink(
                          "View on dashboard",
                          `${this.#registerResponse!.url}/runs/${data.id}`,
                          { fallback: (text, url) => `${text}: (${url})` }
                        )}`
                      );

                      return serverRPC.send("COMPLETE_WORKFLOW_RUN", {
                        runId: data.id,
                        output: JSON.stringify(output),
                        timestamp: String(highPrecisionTimestamp()),
                      });
                    })
                    .catch((anyError) => {
                      const parseAnyError = (
                        error: any
                      ): {
                        name: string;
                        message: string;
                        stackTrace?: string;
                      } => {
                        if (error instanceof Error) {
                          return {
                            name: error.name,
                            message: error.message,
                            stackTrace: error.stack,
                          };
                        }

                        const parsedError = z
                          .object({ name: z.string(), message: z.string() })
                          .passthrough()
                          .safeParse(error);

                        if (parsedError.success) {
                          return parsedError.data;
                        }

                        return {
                          name: "UnknownError",
                          message: "An unknown error occurred",
                        };
                      };

                      const error = parseAnyError(anyError);

                      return serverRPC.send("SEND_WORKFLOW_ERROR", {
                        runId: data.id,
                        error,
                        timestamp: String(highPrecisionTimestamp()),
                      });
                    });
                })
                .catch((anyError) => {
                  return serverRPC.send("SEND_WORKFLOW_ERROR", {
                    runId: data.id,
                    error: anyError,
                    timestamp: String(highPrecisionTimestamp()),
                  });
                });
            }
          );

          return true;
        },
      },
    });

    this.#logger.debug("Successfully initialized RPC with server");

    this.#serverRPC = serverRPC;
  }

  async #initializeHost() {
    if (!this.#connection) {
      throw new Error("Cannot initialize host without a connection");
    }

    if (!this.#serverRPC) {
      throw new Error("Cannot initialize host without an RPC connection");
    }

    const response = await this.#send("INITIALIZE_HOST_V2", {
      apiKey: this.#apiKey,
      workflowId: this.#trigger.id,
      workflowName: this.#trigger.name,
      trigger: this.#trigger.on.metadata,
      packageVersion: pkg.version,
      packageName: pkg.name,
      triggerTTL: this.#options.triggerTTL,
    });

    if (!response) {
      throw new Error("Could not initialize workflow with server");
    }

    if (response?.type === "error") {
      throw new Error(response.message);
    }

    this.#registerResponse = response.data;

    this.#logger.debug("Successfully initialized workflow with server");
  }

  async #send<MethodName extends keyof typeof ServerRPCSchema>(
    methodName: MethodName,
    request: z.input<(typeof ServerRPCSchema)[MethodName]["request"]>
  ) {
    if (!this.#serverRPC) throw new Error("serverRPC not initialized");

    while (true) {
      try {
        this.#logger.debug(
          `Sending RPC request to server: ${methodName}`,
          request
        );

        return await this.#serverRPC.send(methodName, request);
      } catch (err) {
        if (err instanceof TimeoutError) {
          this.#logger.log(
            `RPC call timed out, retrying in ${Math.round(
              this.#retryIntervalMs / 1000
            )}s...`
          );

          this.#logger.error(err);

          await sleep(this.#retryIntervalMs);
        } else {
          throw err;
        }
      }
    }
  }
}

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const messageKey = (runId: string, key: string) => `${runId}:${key}`;

function highPrecisionTimestamp() {
  const [seconds, nanoseconds] = process.hrtime();

  return seconds * 1e9 + nanoseconds;
}
