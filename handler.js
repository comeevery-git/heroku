// handler.js

// Initialize Slack client
const { WebClient } = require("@slack/web-api");
const slackToken = process.env.SLACK_TOKEN;
const slackWeb = new WebClient(slackToken);

// Lazy RethinkDB connection
const r = require("rethinkdb");
const { getRethinkDB } = require("./reql.js");

// Tables
const subTable = "subscriptions";
const userTable = "users";

// matches commands of type "(un)subscribe to/from <@U01C9PRR6TA> in <#C01BHNSMGKT|general>"
const regexUserChannel = /\<\@(?<user_id>\w+)\>.+\<\#(?<channel_id>\w+)\|(?<channel_label>\w+)\>/;

// Handle commands send directly to the bot
exports.handleCommand = async function (event) {
  // Note: since unsubscribe contains subscribe it must come first
  if (event.text.includes("unsubscribe")) {
    unsubscribe(event);
  } else if (event.text.includes("subscribe")) {
    subscribe(event);
  } else if (event.text.includes("list")) {
    list(event);
  } else {
    slackWeb.chat
      .postMessage({
        text:
          "I don't understand. Available commands:\n* subscribe to @user in #channel\n* unsubscribe from @user in #channel\n* list subscriptions",
        channel: event.channel,
      })
      .catch((err) => {
        console.log("Error helping with unknown cmd:", err);
      });
  }
};


let subscribe = async function (event) {
    // Try to understand the subscription command
    const match = event.text.match(regexUserChannel);
    if (!match) {
      slackWeb.chat
        .postMessage({
          text:
            'Who do you want to subscribe to? Use "subscribe to @user in #channel".',
          channel: event.channel,
        })
        .catch((err) => {
          console.log("Error helping with sub cmd:", err);
        });
  
      return;
    }
    let listener = { id: event.user, im: event.channel };
    let user = match.groups.user_id;
    let channel = match.groups.channel_id;
  
    const conn = await getRethinkDB();
    const subIndex = channel + "-" + user;
  
    // Create user
    let lis = await r.table(userTable).get(listener.id).run(conn);
    if (lis == null) {
      await r.table(userTable).insert(listener).run(conn);
    }
  
    let sub = await r.table(subTable).get(subIndex).run(conn);
    if (sub != null) {
      // Subscription exists -> add listener
      sub.listeners.push(listener.id);
      await r
        .table(subTable)
        .get(subIndex)
        .update({ listeners: sub.listeners })
        .run(conn);
      return;
    }
  
    // Create subscription (incl. listener)
    sub = {
      id: subIndex,
      channel: channel,
      user: user,
      listeners: [listener.id],
    };
    await r.table(subTable).insert(sub).run(conn);
  
    // Join channel (if already joined we will get a warning)
    slackWeb.conversations
      .join({
        channel: channel,
      })
      .catch((err) => {
        console.log("Error joining conversation:", err);
      });
  };
  

  let unsubscribe = async function (event) {
    const match = event.text.match(regexUserChannel);
    if (!match) {
      slackWeb.chat
        .postMessage({
          text:
            'Who do you want to unsubscribe from? Use "unsubscribe from @user in #channel".',
          channel: event.channel,
        })
        .catch((err) => {
          console.log("Error helping with unsub cmd:", err);
        });
      return;
    }
    let listener = { id: event.user, im: event.channel };
    let user = match.groups.user_id;
    let channel = match.groups.channel_id;
  
    const conn = await getRethinkDB();
    const subIndex = channel + "-" + user;
  
    let sub = await r.table(subTable).get(subIndex).run(conn);
    if (sub == null) {
      // No subscription --> do nothing
      return;
    }
    const lisIndex = sub.listeners.indexOf(listener.id);
    if (lisIndex < 0) {
      // Not listening --> do nothing
      return;
    }
  
    // Remove listener
    sub.listeners.splice(lisIndex, 1);
    if (sub.listeners.length > 0) {
      // There are still other listeners
      await r
        .table(subTable)
        .get(subIndex)
        .update({ listeners: sub.listeners })
        .run(conn);
      return;
    }
  
    // No more listeners -> remove subscription
    await r.table(subTable).get(subIndex).delete().run(conn);
  
    let chanSubs_cursor = await r
      .table(subTable)
      .getAll(channel, { index: "channel" })
      .run(conn);
    let chanSubs = await chanSubs_cursor.toArray();
    if (chanSubs.length > 0) {
      // There are still subscriptions
      return;
    }
  
    // No more subscriptions -> leave channel
    slackWeb.conversations
      .leave({
        channel: channel,
      })
      .catch((err) => {
        console.log("Error leaving conversation:", err);
      });
  };


  let list = async function (event) {
    const conn = await getRethinkDB();
    let subs_cursor = await r
      .table(subTable)
      .getAll(event.user, { index: "listeners" })
      .run(conn);
    let subs = await subs_cursor.toArray();
    let subList = subs.map(
      (sub) => "* <@" + sub.user + "> in <#" + sub.channel + ">",
    );
    // Respond with subs list
    slackWeb.chat
      .postMessage({
        text: "You are currently subscribed to:\n" + subList.join("\n"),
        channel: event.channel,
      })
      .catch((err) => {
        console.log("Error with list cmd:", err);
      });
  };

  
// Handle message overheard in channels
exports.handleMessage = async function (event) {
    const conn = await getRethinkDB();
    const subIndex = event.channel + "-" + event.user;
    let sub = await r.table(subTable).get(subIndex).run(conn);
    if (sub == null) {
      // No subscription, ignore
      return;
    }
  
    let lis_cursor = await r
      .table(userTable)
      .getAll(r.args(sub.listeners))
      .run(conn);
    lis_cursor.each((err, lis) => {
      // Send IM to lisener
      slackWeb.chat
        .postMessage({
          text:
            "<@" +
            sub.user +
            "> wrote a message in <#" +
            sub.channel +
            ">: " +
            event.text,
          channel: lis.im,
        })
        .catch((err) => {
          console.log("Error notifying about subscribed message:", err);
        });
    });
  };