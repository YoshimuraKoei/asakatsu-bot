const JST = "Asia/Tokyo";

const SHEET_NAME = "points";
const HEADER = ["user_id", "display_name", "points", "last_check_in"];

const CHECK_IN_ACTION_ID = "asakatsu_check_in";
const ADMIN_ACTION_SYNC_SCRIPT_PROPERTIES = "syncScriptPropertiesFromCi";
const ADMIN_ACTION_SETUP_PROJECT = "setupProjectFromCi";
const CHECK_IN_BUTTON_TEXT = "チェックインする";
const MORNING_CHECK_IN_TEXT = "朝活するよ！8:30~9:00の間にボタンを押してね！";
const MORNING_CHECK_IN_BROADCAST_TEXT = "<!channel> 朝活するよ！8:30~9:00の間にボタンを押してね！";
const MORNING_CHECK_IN_CONTEXT_TEXT = "同じ日に 2 回押しても 1 ポイントしか増えないよ〜";
const ALREADY_CHECKED_IN_MESSAGE = "おはよ！今日はもうチェックイン済み！現在のポイントは {points} だよ〜";
const OUTSIDE_CHECK_IN_WINDOW_MESSAGE = "キミは寝坊だよ。反省してもらって良いかな？";
const POINTS_UPDATED_MESSAGE = "おはよ！現在のポイントは {points} だよ〜";
const POINTS_LIST_HEADER = "現在のポイント一覧だよ〜";
const POINTS_LIST_EMPTY_MESSAGE = "まだポイントが記録されてないよ〜";
const POINTS_LIST_USER_RANK_MESSAGE = "キミは{rank}位だよ〜";
const POINTS_LIST_USER_NOT_FOUND_MESSAGE = "キミはまだポイントリストにいないよ〜";

const CHECK_IN_REACTIONS = [
  "やるじゃーん！",
  "朝から頑張れるなんてステキな人！",
  "やあ、見ない顔だね〜",
  "朝活ってやっぱ命そのものよな〜",
  "もう100ポイントぐらい行ったかい？",
  "当たり前のことを当たり前にこなすのって、案外難しいことなんだよね〜",
  "当たり前のことを当たり前にこなすのって、案外難しいことなんだよね〜",
  "朝目覚めてからの3時間は、脳が最も効率よく働く「ゴールデンタイム」とも言われていて、運動能力や記憶力が上がりやすくなるよ。だから、いつもより早く起きて、仕事前などに自分のために時間を使うのに朝活は最適。早く起きたことで作れた時間を、トレーニングやヨガのように心身を整える時間にあてても良いし、資格の勉強や読書のように自分自身を磨く時間に使うも良い感じ。難しいことをする必要はないよ。例えば出社前に会社近くのカフェでコーヒーを飲みながら読書をする、ひと駅手前で電車を降りて歩きながらラジオで情報収集をするなど、朝の時間を有効に使えることができたならば、それは立派な朝活！",
  "今日も朝早いね〜！1500m牛丼、やっちゃう？",
  "他の人にもキミを見習ってほしいんだけどな〜、他の人に強く言っといてよ！",
];

const REQUIRED_SCRIPT_PROPERTIES = [
  "SLACK_BOT_TOKEN",
  "SLACK_CHANNEL_ID",
  "SPREADSHEET_ID",
];

const CI_SCRIPT_PROPERTIES = REQUIRED_SCRIPT_PROPERTIES.concat([
  "ADMIN_API_TOKEN",
]);
