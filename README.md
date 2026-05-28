# 東葛湯めぐりマップ

東葛地域で、今日行きたい温浴施設を地図から探せる湯めぐりマップです。

## ゴール

東葛地域に住んでいる人や、首都圏から東葛地域の温浴施設を探したい人が、モバイル端末からすぐに候補を見つけられる地図サービスにすること。
エンジニアにも扱いやすいように、施設情報はリポジトリ内のデータとして管理し、GitHubから情報追加・修正に参加できる形にすること。

## 主な技術構成

- Astro v6
- TypeScript
- Leaflet + Stadia Maps（Alidade Smooth / OpenStreetMap ベース）
- Astro Content Collection + JSON
- Cloudflare Workers Static Assets
- Vitest
- Prettier / ESLint

## 開発

パッケージマネージャーはpnpmを使用しています。

```sh
pnpm install
pnpm run dev
pnpm run test
pnpm run lint
pnpm run build
```

施設情報は `src/content/spas/` に1施設1JSONで管理します。
施設情報を追加・修正したい場合は、同ディレクトリをご確認ください。

## 設計メモ

基本設計は [docs/basic-design.md](docs/basic-design.md) にまとめています。
