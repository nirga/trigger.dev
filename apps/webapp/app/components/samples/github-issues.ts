export function githubIssues(apiKey: string) {
  return `import { Trigger } from "@trigger.dev/sdk";
import * as github from "@trigger.dev/github";
import * as slack from "@trigger.dev/slack";

new Trigger({
  //todo: ensure this id is only used for this workflow
  id: "github-issues-to-slack",
  name: "Posts to Slack when a GitHub Issue created or modified",
  // For security, we recommend moving this api key to your .env / secrets file. 
  // Our env variable is called TRIGGER_API_KEY
  apiKey: "${apiKey}",
  on: github.events.issueEvent({
    //todo set your repo here
    repo: "my-github-org/my-github-repo",
  }),
  run: async (event, ctx) => {
    //we post a Slack message
    const response = await slack.postMessage("send-to-slack", {
      //todo set your Slack channel name here
      channelName: "my-slack-channel-name",
      text: \`A new issue has been created or modified. \${event.action}\`,
    });

    return response.message;
  },
}).listen();`;
}
