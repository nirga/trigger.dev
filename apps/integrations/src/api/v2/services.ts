import { IntegrationAuthentication } from "core/authentication/types";
import { Service } from "core/service/types";
import { Request, Response } from "express";
import { catalog } from "integrations/catalog";

type ServiceMetadata = {
  name: string;
  service: string;
  version: string;
  icon: string;
  live: boolean;
  authentication: IntegrationAuthentication;
};

export async function handleServices(_req: Request, res: Response) {
  const servicesMetadata: Record<string, ServiceMetadata> = {};
  Object.entries(catalog.services).forEach(([key, service]) => {
    if (service.live === false) return;
    const metadata = omitExtraInfo(service);
    servicesMetadata[key] = {
      ...metadata,
      icon: `/integrations/${metadata.service}.png`,
    };
  });

  res.send(
    JSON.stringify({
      services: servicesMetadata,
    })
  );
}

function omitExtraInfo(
  service: Service
): Omit<Service, "actions" | "retryableStatusCodes"> {
  const { actions, retryableStatusCodes, ...rest } = service;
  return rest;
}
