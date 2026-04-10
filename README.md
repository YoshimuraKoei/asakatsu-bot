# Asakatsu GAS Bot

Google Apps Script を GitHub で管理し、`main` への push で Web アプリを自動デプロイする構成です。

機密値はコードに含めず、Apps Script の `Script Properties` にだけ保存します。

## ディレクトリ

- `src/`: `clasp` で push する Apps Script 本体
- `.github/workflows/deploy-gas.yml`: GitHub Actions による自動デプロイ
- `.clasp.json.example`: `scriptId` 設定の雛形

`src/` は分割ファイル構成で管理します。`clasp push` の対象は `.claspignore` で
`appsscript.json`, `config.js`, `main.js`, `sheet.js`, `slack.js`, `triggers.js`, `utils.js`
に限定しています。`Code.js` は旧構成の名残なので、本番デプロイ対象ではありません。

## 受付仕様

- 毎日 8:30 に Slack へチェックイン投稿
- 8:30 以上 9:00 未満にボタンを押すと 1 ポイント加算
- 同日 2 回目以降の押下は加算なし
- 8:30 より前、または 9:00 以降は加算なし
- 9:00 に未チェックイン者から 1 人をランダムにメンション

## GitHub に置かないもの

以下は GitHub に commit しません。

- `.clasp.json`
- `SLACK_BOT_TOKEN`
- `SLACK_CHANNEL_ID`
- `SPREADSHEET_ID`
- `GAS_DEPLOYMENT_ID`
- `CLASPRC_JSON`

## GitHub Secrets

Actions で以下を設定します。

- `CLASPRC_JSON`: `clasp login` 後の `~/.clasprc.json` 全文
- `CLASP_JSON`: `.clasp.json` の全文
- `GAS_DEPLOYMENT_ID`: 既存の Web アプリ deployment ID
- `SLACK_BOT_TOKEN`
- `SLACK_CHANNEL_ID`
- `SPREADSHEET_ID`

`CLASP_JSON` の中身は次のような形です。

```json
{
  "scriptId": "YOUR_SCRIPT_ID",
  "rootDir": "src"
}
```

## GitHub Actions の流れ

`main` に push すると GitHub Actions が次を実行します。

1. `clasp push -f`
2. `syncScriptPropertiesFromCi_()` で Script Properties を更新
3. `setupProjectFromCi_(true)` でシート作成とトリガー再作成
4. `clasp create-version`
5. `clasp update-deployment`

Script Properties は `setProperties(..., false)` で更新しているため、対象キー以外は消しません。

## 初回セットアップ

1. Apps Script プロジェクトを作る
2. このディレクトリで Git リポジトリを作り、GitHub に push する
3. `scriptId` を確認して `.clasp.json` を作る
4. `clasp push` で `src/` を反映する
5. Apps Script エディタで次を 1 回だけ行う
6. Web アプリ deployment を作る
7. API executable deployment を作る
8. Slack の Request URL に Web アプリ URL を設定する
9. GitHub Secrets を設定する
10. `main` に push して Actions から自動デプロイを確認する

Apps Script エディタで確認する点:

- Web アプリ
  - Execute as: `Me`
  - Who has access: `Anyone`
- API executable
  - 実行関数は `syncScriptPropertiesFromCi_` と `setupProjectFromCi_` のため
  - `clasp run-function` が使える状態にしておく

## ローカル運用

```bash
cd asakatsu-gas-bot
cp .clasp.json.example .clasp.json
clasp push
```

GitHub 管理を始めるときの最小手順:

```bash
git init
git branch -M main
git add .
git commit -m "Initial commit"
git remote add origin <YOUR_GITHUB_REPOSITORY_URL>
git push -u origin main
```

初回だけ手動で実行するとよい関数:

- `setupSheet()`
- `installTriggers()`

CI を使い始めた後は `setupProjectFromCi_()` が同じ役割を持ちます。

## Script Properties

コードは次のキーを必須として読み込みます。

- `SLACK_BOT_TOKEN`
- `SLACK_CHANNEL_ID`
- `SPREADSHEET_ID`

取得箇所は [`src/config.js`](/Users/yoshikoei98/asakatsu-gas-bot/src/config.js) です。

## 補足

- Apps Script には通常の環境変数はないため、秘密値は `Script Properties` を使います
- Script Properties はコードに含まれませんが、Apps Script の編集権限を持つ人には見える前提です
- そのため Apps Script の編集者は最小限に絞る必要があります
