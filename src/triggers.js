function postMorningCheckIn() {
  const props = getConfig_();
  postJson_("https://slack.com/api/chat.postMessage", {
    channel: props.channelId,
    text: "<!channel> 朝活開始！8:30-9:00 の間にボタンを押してください。",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "<!channel> *朝活開始！* 8:30-9:00 の間にボタンを押してください。",
        },
        accessory: {
          type: "button",
          action_id: CHECK_IN_ACTION_ID,
          text: {
            type: "plain_text",
            text: "チェックインする",
          },
          style: "primary",
          value: "check_in",
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "同じ日に 2 回押しても加算は 1 回です。8:30-9:00 が加点対象です。",
          },
        ],
      },
    ],
  });
}

function remindNonCheckins() {
  const props = getConfig_();
  const today = todayJst();
  const sheet = getSheet_();
  const records = readAllRecords_(sheet);
  const checkedIn = {};

  records.forEach(function(record) {
    if (record.lastCheckIn === today) {
      checkedIn[record.userId] = true;
    }
  });

  const membersResp = postJson_("https://slack.com/api/conversations.members", {
    channel: props.channelId,
    limit: 1000,
  });

  const members = (membersResp.members || []).filter(function(memberId) {
    return memberId !== "USLACKBOT" && memberId.charAt(0) !== "B";
  });

  const sleepy = members.filter(function(memberId) {
    return !checkedIn[memberId];
  });

  if (sleepy.length === 0) {
    return;
  }

  const targetUserId = pickRandom_(sleepy);
  const message = pickRandom_(MISSED_CHECK_IN_MESSAGES);
  postJson_("https://slack.com/api/chat.postMessage", {
    channel: props.channelId,
    text: "<@" + targetUserId + "> " + message,
  });
}

function installTriggers() {
  deleteTriggers_();

  ScriptApp.newTrigger("postMorningCheckIn")
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .nearMinute(30)
    .inTimezone(JST)
    .create();

  ScriptApp.newTrigger("remindNonCheckins")
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .nearMinute(0)
    .inTimezone(JST)
    .create();
}

function deleteTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    ScriptApp.deleteTrigger(trigger);
  });
}
