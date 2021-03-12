// index.js

// Initialize Slack event listener
const { createEventAdapter } = require("@slack/events-api");
const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
const slackEvents = createEventAdapter(slackSigningSecret);

const { handleCommand, handleMessage } = require("./handler.js");

// Listen to message event (message.im, message.channel)
slackEvents.on("message", (event) => {
  // Ignore messages from bots
  if (event.bot_id != null) {
    return;
  }
  if (event.channel_type == "im") {
    handleCommand(event);
  } else if (event.channel_type == "channel") {
    handleMessage(event);
  }
});

// Catch and log errors
slackEvents.on("error", (error) => {
  console.log(error);
});

// Run server
const port = process.env.PORT || 5000;
(async () => {
  const server = await slackEvents.start(port);
  console.log(`Listening for events on ${server.address().port}`);
})();