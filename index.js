const { WebClient } = require("@slack/web-api");
const express = require('express');
const path = require('path');

// Read a token from the environment variables
const PORT = process.env.PORT || 5000;
const token = process.env.SLACK_TOKEN;

// Initialize
const web = new WebClient(token);

// schedule start
const schedule = require('node-schedule');
const send = async(message) => {
  slack.api('chat.postMessage', {
      username: 'slack bot',  // 슬랙에 표시될 봇이름
      text: message,
      channel: 'general',  // 메시지가 전송될 채널
      icon_emoji: 'slack'   // 슬랙봇 프로필 이미지
    }, function(err, response){
      console.log(response);
    });
}

schedule.scheduleJob('05 11,23 * * 1-7', function(){
    send('같이 개발 공부하자 😉');
});
schedule.scheduleJob('50 8 * * 1-5', function(){
    send('출근!');
});
schedule.scheduleJob('5 9 * * 1-5', function(){
    send('퇴근!');
});
// schedule end

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