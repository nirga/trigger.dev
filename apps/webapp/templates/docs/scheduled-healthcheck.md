This template contains a [Scheduled](https://docs.trigger.dev/triggers/scheduled) Trigger that will run every 5 minutes and send a Slack message if a website url returns a non-200 response:

```ts
new Trigger({
  // Give your Trigger a stable ID
  id: "scheduled-healthcheck",
  name: "Scheduled Healthcheck",
  // Trigger every 5 minutes, see https://docs.trigger.dev/triggers/scheduled
  on: scheduleEvent({
    rateOf: { minutes: 5 },
  }),
  // The run functions gets called every 5 minutes
  async run(event, ctx) {
    // Fetch the website using generic fetch, see https://docs.trigger.dev/functions/fetch
    const response = await ctx.fetch("🧑‍⚕️", WEBSITE_URL, {
      method: "GET",
      retry: {
        enabled: false, // Disable retrying
      },
    });

    // If the website is down (or we are in a test run), send a message to Slack
    if (!response.ok || ctx.isTest) {
      // Post a message to Slack, see https://docs.trigger.dev/integrations/apis/slack/actions/post-message
      await slack.postMessage("🤒", {
        channelName: "health-checks",
        text: `😭 ${WEBSITE_URL} is down!`,
      });
    }
  },
}).listen();
```

## ✍️ Customize

- You can set the website url by defining the `WEBSITE_URL` environment variable.
- Customize the Slack message and channel name.
- Update the frequency (you can go as frequent as once per minute)

Be sure to check out more over on our [docs](https://docs.trigger.dev)
