function postMorningCheckIn() {
  const props = getConfig_();
  postJson_("https://slack.com/api/chat.postMessage", {
    channel: props.channelId,
    text: MORNING_CHECK_IN_BROADCAST_TEXT,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "<!channel> *" + MORNING_CHECK_IN_TEXT + "*",
        },
        accessory: {
          type: "button",
          action_id: CHECK_IN_ACTION_ID,
          text: {
            type: "plain_text",
            text: CHECK_IN_BUTTON_TEXT,
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
            text: MORNING_CHECK_IN_CONTEXT_TEXT,
          },
        ],
      },
    ],
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
}

function deleteTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    ScriptApp.deleteTrigger(trigger);
  });
}
