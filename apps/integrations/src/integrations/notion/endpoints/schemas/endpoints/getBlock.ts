import { JSONSchema } from "core/schemas/types";
import {
  BlockObjectResponse,
  PartialBlockObjectResponse,
} from "../blockResponses";
import { IdRequest } from "../common";

export const GetBlockPathParameters: JSONSchema = {
  type: "object",
  properties: {
    block_id: IdRequest,
  },
  required: ["block_id"],
  additionalProperties: false,
};

export const GetBlockParameters: JSONSchema = GetBlockPathParameters;

export const GetBlockResponse: JSONSchema = {
  anyOf: [PartialBlockObjectResponse, BlockObjectResponse],
};
