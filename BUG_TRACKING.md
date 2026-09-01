# 🐞 バグ管理＆テスト記録シート (Bug Tracking & Test Matrix)

本ドキュメントは、「みんなの安全マップ」における不具合・エッジケースの発見・修正状況の追跡、および動作テスト（単体・結合・E2E）の網羅性を管理するためのバグ管理表です。

---

## 📊 バグ管理ステータス要約

| 深刻度 | 検出総数 | 修正・テスト済 (🟢) | 対応中 (🟡) | 未対応 (🔴) |
| :--- | :---: | :---: | :---: | :---: |
| **Critical (緊急・重大)** | 1 | 1 | 0 | 0 |
| **High (高・機能不全)** | 2 | 2 | 0 | 0 |
| **Medium (中・UX/エッジケース)** | 3 | 2 | 1 | 0 |
| **Low (低・軽微な改善)** | 1 | 0 | 1 | 0 |
| **合計** | **7** | **5** | **2** | **0** |

---

## 📋 バグ一覧・追跡台帳 (Bug Tracking Log)

### 🟢 修正・テスト通過済み (Resolved)

| ID | 対象コンポーネント | 現象 / エッジケース | 深刻度 | 原因と対応内容 | テストコード |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **BUG-001** | [App.tsx](file:///C:/Users/denshi15/Desktop/tizu1/frontend/src/App.tsx) | 投稿フォームの `<label>` に `htmlFor` がなく、フォームコントロールと紐付いていなかった（アクセシビリティ低下・テスト自動化阻害） | High | `<label htmlFor="...">` および `<select id="...">`、`<textarea id="...">` を明示的に設定。 | `frontend/src/__tests__/HazardFormAndList.test.tsx` |
| **BUG-002** | [backend/server.ts](file:///C:/Users/denshi15/Desktop/tizu1/backend/server.ts) | テスト実行時に本番用 `hazards.json` が上書きされる、およびポート衝突によりテストが実行できない問題 | Critical | `process.env.HAZARDS_DATA_FILE` によるデータファイル切り替え、およびテスト時の `app.listen` スキップと `app` エクスポートに対応。 | `backend/__tests__/api.test.ts` |
| **BUG-003** | [App.tsx](file:///C:/Users/denshi15/Desktop/tizu1/frontend/src/App.tsx) | 未知のカテゴリ名がバックエンドから返された場合、アイコンやスタイルが崩れるリスク | Medium | `typeColors[type] || typeColors.Other` および `colors[type] || colors.Other` のフォールバック定義を徹底。 | `frontend/src/__tests__/markerIcon.test.ts` |
| **BUG-004** | [App.tsx](file:///C:/Users/denshi15/Desktop/tizu1/frontend/src/App.tsx) | 他人の投稿した危険箇所でも「なおす📝」ボタンが見えてしまい誤解を招く可能性 | High | `myHazardIds`（localStorage）に含まれない投稿には「なおす📝」ボタンを非表示化、権限注記を表示。 | `frontend/src/__tests__/HazardFormAndList.test.tsx` |
| **BUG-005** | [backend/server.ts](file:///C:/Users/denshi15/Desktop/tizu1/backend/server.ts) | 存在しないハザードIDに対するコメント投稿や更新時に 500 エラーまたはデータ不整合が発生する | Medium | `findIndex === -1` 時の 404 エラーハンドリングおよび空コメントの 400 バリデーションを追加。 | `backend/__tests__/api.test.ts` |

---

### 🟡 改善・対応中 (In Progress)

| ID | 対象コンポーネント | 現象 / 改善要望 | 深刻度 | 予定されている対応方針 | 担当 |
| :--- | :--- | :--- | :---: | :--- | :---: |
| **BUG-006** | [App.tsx](file:///C:/Users/denshi15/Desktop/tizu1/frontend/src/App.tsx) | ネットワーク切断時やサーバーダウン時に `fetch` が失敗した際、ユーザーにエラーが伝わらない | Medium | トースト通知（「つうしんに しっぱいしたよ」等のひらがなアラート）の追加 | Aさん / Bさん |
| **BUG-007** | [backend/server.ts](file:///C:/Users/denshi15/Desktop/tizu1/backend/server.ts) | 危険箇所を更新・削除した際に、古い画像ファイルが `backend/uploads/` に残留し続ける | Low | 画像更新/削除時の `fs.unlink` クリーンアップ処理、またはクラウドストレージ移行時に自動ライフサイクル管理 | Cさん |

---

## 🧪 テスト仕様・マトリクス (Test Coverage Matrix)

### 1. フロントエンド (`frontend/src/__tests__/`)

| テストファイル | テスト項目 | 検証内容 | 判定 |
| :--- | :--- | :--- | :---: |
| [`markerIcon.test.ts`](file:///C:/Users/denshi15/Desktop/tizu1/frontend/src/__tests__/markerIcon.test.ts) | カテゴリ別ピン色分け | Traffic(赤), Crime(水色), Disaster(灰色), Lighting(黄), Other(紫) の背景色 | 🟢 PASS |
| | 未知カテゴリフォールバック | 想定外の文字列でも Other(紫) に安全にフォールバック | 🟢 PASS |
| | 「じぶん」バッジと金枠 | `isMine=true` で金色枠線(`#F1C40F`)と「じぶん」バッジ描画 | 🟢 PASS |
| | 自宅ピン (`getHomeIcon`) | 🏠 アイコンと専用スタイルの生成 | 🟢 PASS |
| | 配色整合性 (GEMINI.md) | `typeColors` と `getMarkerIcon` の配色の一致、ひらがなラベルの存在 | 🟢 PASS |
| [`HazardFormAndList.test.tsx`](file:///C:/Users/denshi15/Desktop/tizu1/frontend/src/__tests__/HazardFormAndList.test.tsx) | 一覧初期ロード | APIから取得したハザード一覧が正しく画面に表示される | 🟢 PASS |
| | ピンの描画 | 地図上に登録済みハザードピンと自宅ピンが描画される | 🟢 PASS |
| | 座標未選択バリデーション | 地図未選択での送信時に「ちずを おして ばしょを えらんでね！」アラート | 🟢 PASS |
| | 編集権限の制御 | 自分の投稿にのみ「なおす📝」ボタンが表示される | 🟢 PASS |
| | 編集・キャンセル動作 | 編集開始でフォームに値が反映され、「やめる」で通常モードに戻る | 🟢 PASS |
| | コメント投稿 | コメント入力後に「おく」ボタン押下で即時反映される | 🟢 PASS |
| | カテゴリ選択 | ドロップダウンでの安全なカテゴリ切り替え | 🟢 PASS |

---

### 2. バックエンド (`backend/__tests__/`)

| テストファイル | 対象API | 検証内容 | 判定 |
| :--- | :--- | :--- | :---: |
| [`api.test.ts`](file:///C:/Users/denshi15/Desktop/tizu1/backend/__tests__/api.test.ts) | `GET /api/hazards` | 登録済みハザード一覧の正常取得 (200) | 🟢 PASS |
| | `POST /api/hazards` | 新規ハザード登録とID自動付番、ファイル永続化 (201) | 🟢 PASS |
| | `POST /api/hazards/:id/comments` | コメント追加とタイムスタンプ自動付与 (201) | 🟢 PASS |
| | `POST /api/hazards/:id/comments` | 空テキスト時の 400 エラーハンドリング | 🟢 PASS |
| | `POST /api/hazards/:id/comments` | 存在しないハザードIDに対する 404 エラー | 🟢 PASS |
| | `PUT /api/hazards/:id` | カテゴリ・説明文の正常更新 (200) | 🟢 PASS |
| | `PUT /api/hazards/:id` | 存在しないID更新時の 404 エラー | 🟢 PASS |
| | `DELETE /api/hazards/:id` | ハザードの解決（削除）とデータ整合性 (200) | 🟢 PASS |

---

## 🛠️ テストの実行方法

```bash
# フロントエンドの全テストを実行
cd frontend
npm test

# バックエンドの全テストを実行
cd backend
npm test
```

※ GitHub Actions CI (`.github/workflows/ci.yml`) にも組み込まれており、コミットやプルリクエスト時に自動で全テストが実行・検証されます。

---

## 📝 新規バグ報告用テンプレート (Bug Report Template)

開発メンバーが新しいバグを発見した際は、以下の形式で本シートに追記してください。

```markdown
### [BUG-XXX] タイトル (簡潔な現象名)
- **検出日**: YYYY-MM-DD
- **報告者**: ○○さん
- **対象環境**: モバイル (iOS/Android) / デスクトップ (Chrome/Edge/Safari)
- **深刻度**: [Critical / High / Medium / Low]
- **再現手順**:
  1. ○○画面を開く
  2. ○○ボタンを押す
  3. ○○が発生する
- **期待される動作**: ○○となるべき
- **対応方針 / 担当**: ○○さん
```
