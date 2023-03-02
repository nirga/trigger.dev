import { Service } from "core/service/types";
import { authentication } from "./authentication";
import actions from "./actions/actions";

export const notion: Service = {
  name: "Notion",
  service: "notion",
  version: "0.1.22",
  baseUrl: "https://api.notion.com",
  live: true,
  authentication,
  actions,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};
