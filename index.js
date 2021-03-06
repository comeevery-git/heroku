const { WebClient } = require("@slack/web-api");
const express = require('express');
const path = require('path');
const axios = require('axios');

// server port, token
const PORT = process.env.PORT || 5000;
const token = process.env.SLACK_TOKEN;
const puglogURL = process.env.PUGLOG_URL_WEBHOOK;

// Initialize
const web = new WebClient(token);

const header = {'Content-Type': 'application/json'};
// schedule
const schedule = require('node-schedule');
const { json } = require("express");
// Send Message - Webhook
const sendMessage = async ({ text }) => {
  const textData = {"text":text};
  console.log(`textData :::::::: ${textData}`);
  console.log(`text :::::::: ${text}`);
  console.log(`header :::::::: ${header}`);
  try {
    const { data } = await axios({
      method: 'post',
      url: puglogURL,
      data: textData,
      headers: header
    });
    return data;
  } catch (error) {
    console.error(error);
  }
};

schedule.scheduleJob('*/10 * * * * *', function(){
  console.log(`π health check ${new Date()}`);
});
schedule.scheduleJob('0 */2 * * * *', function(){
  sendMessage({text: 'κ°μ΄ κ°λ° κ³΅λΆνμ π'});
});
schedule.scheduleJob('0 * 00 * * 1-5', function(){
  sendMessage({text: 'μΆκ·Ό!'});
});
schedule.scheduleJob('0 * 8 * * 1-5', function(){
  sendMessage({text: 'ν΄κ·Ό!'});
});

// basic communication
express()
  .use(express.json())
  .post("/slack/events", (req, res) => {
    let body = req.body;
    let event = body.event;
    if (body.type === "event_callback") {
      console.log(event);
      if (event.type === "message") {
        if (event.text === "μλ") {
          console.log(
            `λ©μμ§ μμ  channel:${event.channel}, user:${event.user}`
          );
          web.chat
            .postMessage({ channel: event.channel, text: `μλνμΈμ. ${event.user}λ! ` })
            .then((result) => {
              console.log("Message sent: " + result.ts);
            });
          res.sendStatus(200);
        }
      }
    } else if (body.type === "url_verification") {
      // URL κ²μ¦μ μν μ²λ¦¬
      console.log("url verification");
      res.send(body.challenge);
    } else {
      res.sendStatus(200);
    }
  })
  .listen(PORT, () => console.log(`Listening on ${PORT}`));