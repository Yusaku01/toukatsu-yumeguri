# 東葛湯めぐりマップ

東葛地域で、今日行きたい温浴施設を地図から探せる湯めぐりマップです。

## 現時点の目的

- 東葛地域の日帰り温浴施設を地図上のピンで分かりやすく見られるようにする
- 同じ施設情報をリスト形式でも閲覧できるようにする
- 最低限の利用規約・プライバシーポリシーを用意する
- GitHubから情報追加・修正に参加できる導線を用意する

## ゴール

東葛地域に住んでいる人や、首都圏から東葛地域の温浴施設を探したい人が、モバイル端末からすぐに候補を見つけられる地図サービスにする。

エンジニアにも扱いやすいように、施設情報はリポジトリ内のデータとして管理し、GitHubから情報追加・修正に参加できる形にする。

## 技術方針

- Astro v6
- TypeScript strict
- Leaflet + OpenStreetMap
- Astro Content Collection + 1施設1JSON
- Cloudflare Workers Static Assets
- pnpm
- Vitest
- Prettier / ESLint

## 開発

```sh
pnpm install
pnpm run dev
pnpm run test
pnpm run lint
pnpm run build
```

施設情報は `src/content/spas/` に1施設1JSONで管理します。

## デプロイ

Cloudflare Workers Static Assets を使います。デプロイは Cloudflare Workers の Git integration で行い、`main` ブランチへのpushをproductionデプロイのトリガーにします。

GitHub Actionsは、PRと`main` push時のフォーマットチェック、Lint、テスト、ビルド確認に使います。

Cloudflare側の設定目安:

- Repository: `Yusaku01/toukatsu-yumeguri`
- Production branch: `main`
- Build command: `pnpm install --frozen-lockfile && pnpm run build`
- Deploy command: `pnpm exec wrangler deploy`
- Root directory: `/`

## ターゲットユーザー

- 東葛地域に住んでいる人
- エンジニア
- 首都圏在住の人

## 利用端末

- モバイル主体
- Desktopにも対応

## 設計メモ

基本設計は [docs/basic-design.md](docs/basic-design.md) にまとめています。

実装前の推奨計画は [docs/recommended-plan.md](docs/recommended-plan.md) にまとめています。
