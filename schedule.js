const Slack = require('slack-node'); 
const schedule = require('node-schedule');
apiToken = process.env.SLACK_TOKEN||'Your Token';
const slack = new Slack(apiToken);
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
send('슬랙에 메시지를 전송합니다.');
schedule.scheduleJob('50 8 * * 1-5', function(){
    send('출근!');
});
schedule.scheduleJob('5 9 * * 1-5', function(){
    send('퇴근!');
});