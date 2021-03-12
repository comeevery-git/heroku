const express = require('express')
const path = require('path')
const { WebClient } = require('@slack/web-api');
var PORT = process.env.PORT || 3000;
// OAuth & Permissions 설정 페이지에서 생성된 Bot User OAuth Access Token
const token = 'xoxb-1874615282960-1856981463604-0rYmANCkUO9qX1y4TWYahX00'; 
const web = new WebClient(token);

express()
  .use(express.json())
  .post("/slack/events", (req, res) => {
    let body = req.body;
    let event = body.event;
    if (body.type === "event_callback") {
      console.log(event);
      if (event.type === "message") {
        if (event.text === "안녕") {
          console.log(
            `메시지 수신 channel:${event.channel}, user:${event.user}`
          );
          web.chat
            .postMessage({ channel: event.channel, text: "안녕하세요 😉" })
            .then((result) => {
              console.log("Message sent: " + result.ts);
            });
          res.sendStatus(200);
        }
      }
    } else if (body.type === "url_verification") {
      // URL 검증을 위한 처리
      console.log("url verification");
      res.send(body.challenge);
    } else {
      res.sendStatus(200);
    }
  })
  .listen(PORT, () => console.log(`Listening on ${PORT}`));