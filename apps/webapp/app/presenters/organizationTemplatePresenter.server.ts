import type { PrismaClient } from "~/db.server";
import { prisma } from "~/db.server";
import { getRuntimeEnvironment } from "~/models/runtimeEnvironment.server";
import { renderMarkdown } from "~/services/renderMarkdown.server";
import type { TemplateListItem } from "./templateListPresenter.server";
import { WorkflowsPresenter } from "../presenters/workflowsPresenter.server";
import { getServiceMetadatas } from "~/models/integrations.server";
import { DEV_ENVIRONMENT, LIVE_ENVIRONMENT } from "~/consts";

export class OrganizationTemplatePresenter {
  #prismaClient: PrismaClient;

  constructor(prismaClient: PrismaClient = prisma) {
    this.#prismaClient = prismaClient;
  }

  async data(templateId: string, environmentSlug: string) {
    const organizationTemplate =
      await this.#prismaClient.organizationTemplate.findUnique({
        where: {
          id: templateId,
        },
        include: {
          template: true,
          authorization: true,
          organization: {
            include: {
              environments: true,
            },
          },
        },
      });

    if (!organizationTemplate) {
      throw new Error("Organization template not found");
    }

    const runtimeEnvironment = await getRuntimeEnvironment({
      organizationId: organizationTemplate.organizationId,
      slug: environmentSlug,
    });

    if (!runtimeEnvironment) {
      throw new Error("Runtime environment not found");
    }

    const workflowsPresenter = new WorkflowsPresenter(this.#prismaClient);

    const workflows = await workflowsPresenter.data(
      {
        organizationId: organizationTemplate.organizationId,
        slug: {
          in: organizationTemplate.template.workflowIds,
        },
      },
      runtimeEnvironment.id
    );

    const repositoryName =
      organizationTemplate.repositoryUrl.split("/").pop() ??
      "missing repository name";

    const serviceMetadatas = await getServiceMetadatas(true);

    const template: TemplateListItem = {
      ...organizationTemplate.template,
      services: organizationTemplate.template.services.map(
        (s) => serviceMetadatas[s]
      ),
      docsHTML: renderMarkdown(organizationTemplate.template.markdownDocs),
    };

    const developmentApiKey =
      organizationTemplate.organization.environments.find(
        (e) => e.slug === DEV_ENVIRONMENT
      )?.apiKey;
    const liveApiKey = organizationTemplate.organization.environments.find(
      (e) => e.slug === LIVE_ENVIRONMENT
    )?.apiKey;

    return {
      template,
      organizationTemplate,
      developmentApiKey,
      liveApiKey,
      workflows,
      runLocalDocsHTML: renderLocalDocsHTML(
        organizationTemplate.repositoryUrl,
        organizationTemplate.template.repositoryUrl,
        organizationTemplate.name,
        organizationTemplate.template.slug,
        developmentApiKey ?? runtimeEnvironment.apiKey,
        organizationTemplate.template.runLocalDocs
      ),
      repositoryName,
    };
  }
}

// Replace the templateRepoUrl in localDocs with the finalRepoUrl, and then renderMarkdown
function renderLocalDocsHTML(
  finalRepoUrl: string,
  templateRepoUrl: string,
  finalRepoName: string,
  templateRepoName: string,
  apiKey: string,
  localDocs: string
) {
  // Replace all instances (not just the first) of the templateRepoUrl with the finalRepoUrl
  const finalRepoUrlRegex = new RegExp(templateRepoUrl, "g");
  let finalDocs = localDocs.replace(finalRepoUrlRegex, finalRepoUrl);

  // Replace all instances (not just the first) of the templateRepoName with the finalRepoName
  const finalRepoNameRegex = new RegExp(`cd ${templateRepoName}`, "g");
  finalDocs = finalDocs.replace(finalRepoNameRegex, `cd ${finalRepoName}`);

  // Replace all instances of <API_KEY> or <APIKEY> or <your api key> with the apiKey
  const apiRegex = new RegExp("<API_KEY>", "g");
  finalDocs = finalDocs.replace(apiRegex, apiKey);

  const apiRegex2 = new RegExp("<APIKEY>", "g");
  finalDocs = finalDocs.replace(apiRegex2, apiKey);

  const apiRegex3 = new RegExp("<your api key>", "g");
  finalDocs = finalDocs.replace(apiRegex3, apiKey);

  return renderMarkdown(finalDocs);
}
