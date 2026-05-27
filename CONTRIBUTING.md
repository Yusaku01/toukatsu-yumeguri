# Contributing

東葛湯めぐりマップへの施設追加・修正提案を歓迎します。

## 施設情報の方針

- 公式サイトや施設運営元の公開情報を優先してください。
- 住所やURLを変更した場合は、確認日も更新してください。
- 営業時間、料金、休館日は変わりやすいため、MVPでは原則として掲載しません。

## 開発

```sh
pnpm install
pnpm run dev
pnpm run test
pnpm run build
```

## 命名規則

ブランチ名、コミットメッセージ、Pull Requestタイトルは、基本的にConventional Commitsに従ってください。

例:

- `feat: add facility filters`
- `fix: correct spa address`
- `docs: update contribution guide`
- `chore: remove unused files`

ブランチ名は、Conventional Commitsのtypeを先頭にした短いkebab-caseにします。

例:

- `feat/add-facility-filters`
- `fix/correct-spa-address`
- `docs/update-contribution-guide`

## ページ配置

`src/pages/` 配下のページは、原則としてディレクトリ単位で管理します。

- `/list/` は `src/pages/list/index.astro`
- `/terms/` は `src/pages/terms/index.astro`

`src/pages/list.astro` のようにページ名を直接ファイル名にする配置は避けてください。
このルールはESLintでも検出します。

Pull Requestでは、変更内容と確認したコマンドを短く書いてください。
