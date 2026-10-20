# 🐞 バグ管理＆テスト記録シート (Bug Tracking & Test Matrix)

本ドキュメントは、「みんなの安全マップ」における不具合・エッジケースの発見・修正状況の追跡、および動作テスト（単体・結合・E2E）の網羅性を管理するためのバグ管理表です。

---

## 📊 バグ管理ステータス要約

| 深刻度 | 検出総数 | 修正・テスト済 (🟢) | 対応中 (🟡) | 未対応 (🔴) |
| :--- | :---: | :---: | :---: | :---: |
| **Critical (緊急・重大)** | 1 | 1 | 0 | 0 |
| **High (高・機能不全)** | 7 | 7 | 0 | 0 |
| **Medium (中・UX/エッジケース)** | 6 | 6 | 0 | 0 |
| **Low (低・軽微な改善)** | 6 | 6 | 0 | 0 |
| **合計** | **20** | **20** | **0** | **0** |

---

## 📋 バグ一覧・追跡台帳 (Bug Tracking Log)

### 🟢 修正・テスト通過済み (Resolved)

| ID | 対象コンポーネント | 現象 / エッジケース | 深刻度 | 原因と対応内容 | テストコード |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **BUG-001** | [App.tsx](file:///C:/Users/denshi36/Desktop/maho/frontend/src/App.tsx) | 投稿フォームの `<label>` に `htmlFor` がなく、フォームコントロールと紐付いていなかった（アクセシビリティ低下・テスト自動化阻害） | High | `<label htmlFor="...">` および `<select id="...">`、`<textarea id="...">` を明示的に設定。 | `frontend/src/__tests__/HazardFormAndList.test.tsx` |
| **BUG-002** | [backend/server.ts](file:///C:/Users/denshi36/Desktop/maho/backend/server.ts) | テスト実行時に本番用 `hazards.json` が上書きされる、およびポート衝突によりテストが実行できない問題 | Critical | `process.env.HAZARDS_DATA_FILE` によるデータファイル切り替え、およびテスト時の `app.listen` スキップと `app` エクスポートに対応。 | `backend/__tests__/api.test.ts` |
| **BUG-003** | [App.tsx](file:///C:/Users/denshi36/Desktop/maho/frontend/src/App.tsx) | 未知のカテゴリ名がバックエンドから返された場合、アイコンやスタイルが崩れるリスク | Medium | `typeColors[type] || typeColors.Other` および `colors[type] || colors.Other` のフォールバック定義を徹底。 | `frontend/src/__tests__/markerIcon.test.ts` |
| **BUG-004** | [App.tsx](file:///C:/Users/denshi36/Desktop/maho/frontend/src/App.tsx) | 他人の投稿した危険箇所でも「なおす📝」ボタンが見えてしまい誤解を招く可能性 | High | `myHazardIds`（localStorage）に含まれない投稿には「なおす📝」ボタンを非表示化、権限注記を表示。 | `frontend/src/__tests__/HazardFormAndList.test.tsx` |
| **BUG-005** | [backend/server.ts](file:///C:/Users/denshi36/Desktop/maho/backend/server.ts) | 存在しないハザードIDに対するコメント投稿や更新時に 500 エラーまたはデータ不整合が発生する | Medium | `findIndex === -1` 時の 404 エラーハンドリングおよび空コメントの 400 バリデーションを追加。 | `backend/__tests__/api.test.ts` |
| **BUG-006** | [App.tsx](file:///C:/Users/denshi36/Desktop/maho/frontend/src/App.tsx) | ネットワーク切断時やサーバーダウン時に `fetch` が失敗した際、ユーザーにエラーが伝わらない | Medium | `fetchHazards` や各APIコールに親切なトースト通知（「つうしんに しっぱいしたよ」等）を追加。 | `frontend/src/__tests__/HazardFormAndList.test.tsx` |
| **BUG-007** | [backend/server.ts](file:///C:/Users/denshi36/Desktop/maho/backend/server.ts) | 危険箇所を更新・削除した際に、古い画像ファイルが `backend/uploads/` に残留し続ける | Low | `storageService.ts` の `deleteImage` を `PUT`（画像更新時）および `DELETE`（ハザード解決時）に統合。 | `backend/__tests__/api.test.ts` |
| **BUG-008** | [App.tsx](file:///C:/Users/denshi36/Desktop/maho/frontend/src/App.tsx) / [aiRoutes.ts](file:///C:/Users/denshi36/Desktop/maho/backend/routes/aiRoutes.ts) | AIあんぜんアドバイス取得時、レスポンスのキー名不一致（`advice` ↔ `forKids`）で画面に表示されない | High | バックエンドの `/api/ai/advice` で `advice` プロパティを返却し、フロントでも `data.forKids || data.advice` を参照可能に修正。 | `backend/__tests__/api.test.ts` |
| **BUG-009** | [App.tsx](file:///C:/Users/denshi36/Desktop/maho/frontend/src/App.tsx) / [aiRoutes.ts](file:///C:/Users/denshi36/Desktop/maho/backend/routes/aiRoutes.ts) | 投稿フォームの「✨ AI判定」ボタン押下時に 404 エラーとなり自動判定が動作しない | High | バックエンドに `POST /api/ai/analyze-hazard` を実装し、パラメータ（`description`/`text`）と戻り値（`type`/`suggestedType`）を双方向サポート。 | `backend/__tests__/api.test.ts` |
| **BUG-010** | [mapUtils.ts](file:///C:/Users/denshi36/Desktop/maho/frontend/src/utils/mapUtils.ts) / [App.tsx](file:///C:/Users/denshi36/Desktop/maho/frontend/src/App.tsx) | 「こども安心スポット (ChildSafety)」のカテゴリ定義が `typeLabels` / `typeColors` になく配色不整合 | Low | `mapUtils.ts` に青緑色 (`#1ABC9C`) 定義とひらがなラベルを追加し、投稿フォームにも選択肢を追加。 | `frontend/src/__tests__/markerIcon.test.ts` |
| **BUG-011** | [.github/workflows/ci.yml](file:///C:/Users/denshi36/Desktop/maho/.github/workflows/ci.yml) / [cd.yml](file:///C:/Users/denshi36/Desktop/maho/.github/workflows/cd.yml) | GitHub Actions CIでNode.js 20が指定されており、`jsdom 30` (要件Node >=22) が初期化できずフロントエンドテストがクラッシュする | High | `ci.yml` および `cd.yml` の `node-version` をローカル環境と合致する `24` に更新。 | `frontend/src/__tests__/HazardFormAndList.test.tsx` |
| **BUG-012** | [App.tsx](file:///C:/Users/denshi36/Desktop/maho/frontend/src/App.tsx) / [setup.ts](file:///C:/Users/denshi36/Desktop/maho/frontend/src/test/setup.ts) | SSE購読で `EventSource` 未定義チェックがなくJSDOM環境で例外発生、およびブラウザAPIモックの不足 | Medium | `typeof EventSource === 'undefined'` ガードを追加し、`setup.ts` に `EventSource`, `scrollTo`, `matchMedia` のモックを定義。 | `frontend/src/__tests__/HazardFormAndList.test.tsx` |
| **BUG-013** | [hazards.json](file:///C:/Users/denshi36/Desktop/maho/backend/data/hazards.json) | マージ競合解消時に全角スペース・閉じクォート欠落・カンマ欠落・重複プロパティ残骸が混入しJSON構文エラー（SyntaxError）が発生 | High | 全角スペース除去、閉じクォート・カンマ補完、末尾の不要残骸削除とフォーマット正規化を実施。全36件のデータを正常化。 | `backend/__tests__/api.test.ts` |
| **BUG-014** | [backend/server.ts](file:///C:/Users/denshi36/Desktop/maho/backend/server.ts) | PostGIS近傍クエリのLIMIT未バインドによるSQLインジェクション脆弱性、Multer/フィードバック例外ハンドリング不足、テスト時の本番feedback.json汚染リスク | High | LIMIT句のパラメータ化（`$N`）、座標・半径バリデーション、Multer例外のJSONエラーハンドラー導入、`FEEDBACK_DATA_FILE` 環境変数によるテストデータ完全分離を実装。 | `backend/__tests__/api.test.ts` |
| **BUG-015** | [backend/.env.example](file:///C:/Users/denshi36/Desktop/maho/backend/.env.example) | `PORT=3001` が2重定義され、PostGIS/S3/Cloudinary等の最新環境変数が未記載、および過去のコミット履歴に起因するCI失敗ログ（❌）が表示される問題 | Low | `PORT` 重複解消、Gemini/DB/S3/Cloudinary/Server全環境変数の網羅・詳細コメント追記、および最新CIでの全テスト合格検証。 | `backend/__tests__/api.test.ts` / CIパイプライン |
| **BUG-016** | [markerIcon.test.ts](file:///C:/Users/denshi36/Desktop/maho/frontend/src/__tests__/markerIcon.test.ts) | 新規カテゴリ（避難所・AED）および危険度別マーカー（動的サイズ・Lvバッジ・アニメーションクラス）のテスト未網羅、および過去コミット履歴（`1be9e3a`）に起因するCIエラーログ（❌）が表示される問題 | Low | 全8カテゴリ（Traffic, Crime, Disaster, Lighting, Shelter, AED, ChildSafety, Other）の背景色・絵文字・ひらがなラベル整合性テスト、危険度Lv.1〜5のサイズ/アンカー/バッジ/アニメーションクラス検証、自宅アイコン仕様テストを完備し、最新CIチェック（Lint, Test, Build）の合格を検証。 | `frontend/src/__tests__/markerIcon.test.ts` |
| **BUG-017** | [LocationContext.tsx](file:///C:/Users/denshi36/Desktop/maho/frontend/src/context/LocationContext.tsx) | 過去のコミット履歴（`1be9e3a`）に起因するCIエラーログ（❌）の表示、`watchId` state更新に伴うクリーンアップ誤破棄（ライフサイクルバグ）、シミュレーションの `userPos` 更新によるインターバルリセット、`localStorage` 例外クラッシュリスク、テストコード未網羅 | Medium | `watchIdRef` 導入によるトラッキング登録・破棄ライフサイクルの健全化（アンマウント時完全解放）、シミュレーション基準座標固定によるループ安定化、`localStorage` の `try-catch` 安全保護とアバターバリデーション、`calculateHeading` の方位角計算エクスポート、および包括的単体テスト（24件）を作成・検証。 | `frontend/src/__tests__/LocationContext.test.tsx` |
| **BUG-018** | [types.ts](file:///C:/Users/denshi36/Desktop/maho/frontend/src/types.ts) | 過去のコミット履歴（`4255380`）に起因するGitHub Actions「Frontend CI (Lint, Test & Build) (pull_request)」の失敗ステータス（❌）が表示される問題、危険度・時間帯・AIアドバイス・EnhancedHazard等の型定義不足、型ガードおよび単体テスト未網羅 | Low | 全8カテゴリ（Traffic, Crime, Disaster, Lighting, Shelter, AED, ChildSafety, Other）の `HAZARD_TYPES` / `HazardType` 定義、`EnhancedHazard` / `AiAdvice` / `NearbyHazardsResponse` / `FeedbackItem` 等の型定義拡充、`App.tsx` の重複型定義一元化、安全な型ガード関数（`isHazard`, `isValidHazardType`, `clampDangerLevel`）の実装、および単体テスト（19件）を整備・検証。 | `frontend/src/__tests__/types.test.ts` |
| **BUG-019** | [eslint.config.js](file:///C:/Users/denshi36/Desktop/maho/frontend/eslint.config.js) | 過去のコミット履歴（`1d04747`）に起因するGitHub Actions「Frontend CI (Lint, Test & Build) (push)」の失敗ステータス（❌）が表示される問題、除外パターン（coverage/node_modules/public等）やテスト・設定ファイル別globals/ルール設定の不足、設定検証単体テスト未網羅 | Low | `globalIgnores` に `coverage`, `node_modules`, `public`, `*.local` を追加、テストファイル用（Vitest/Node globals）・設定ファイル用（Node globals）のオーバーライド設定を追加、`_` prefix 未使用変数許容設定を導入、およびESLint設定・リンター動作を包括的に検証する単体テスト（8件）を整備。 | `frontend/src/__tests__/eslintConfig.test.ts` |

---

### 🟡 改善・対応中 (In Progress)

*現在対応中の保留バグはありません（全件解決・テスト合格）。*

---

## 🧪 テスト仕様・マトリクス (Test Coverage Matrix)

### 1. フロントエンド (`frontend/src/__tests__/`)

| テストファイル | テスト項目 | 検証内容 | 判定 |
| :--- | :--- | :--- | :---: |
| [`markerIcon.test.ts`](file:///C:/Users/denshi36/Desktop/maho/frontend/src/__tests__/markerIcon.test.ts) | 全8カテゴリ別ピン色・絵文字 | Traffic(赤/🚗), Crime(水色/👮), Disaster(灰/🌊), Lighting(黄/🌙), Shelter(緑/🏫), AED(橙/💓), ChildSafety(青緑/🏠), Other(紫/🐾) の背景色・絵文字生成 | 🟢 PASS |
| | 未知カテゴリフォールバック | 想定外の文字列でも Other(紫/🐾) に安全にフォールバック | 🟢 PASS |
| | 「じぶん」バッジと金枠 | `isMine=true` で金色枠線(`#F1C40F`)と「じぶん」バッジ描画、`false` で通常白枠 | 🟢 PASS |
| | 危険度別動的サイズ・視覚効果 | Lv.1(24px)〜Lv.5(58px)のピン拡縮、Lv.Xバッジ背景色、Lv.4(`pulse-marker`)/Lv.5(`alert-marker`)クラス付与、範囲外危険度の安全なクランプ処理 | 🟢 PASS |
| | 自宅ピン (`getHomeIcon`) | 🏠 アイコン、背景色(`#2C3E50`)、専用スタイル、サイズ(`[36, 36]`)とアンカー(`[18, 18]`) | 🟢 PASS |
| | GEMINI.md 配色・ひらがな整合性 | 全8カテゴリの `typeColors` と `getMarkerIcon` の背景色完全一致、`typeLabels` ひらがなラベル・絵文字の完全網羅 | 🟢 PASS |
| [`HazardFormAndList.test.tsx`](file:///C:/Users/denshi36/Desktop/maho/frontend/src/__tests__/HazardFormAndList.test.tsx) | 一覧初期ロード | APIから取得したハザード一覧が正しく画面に表示される | 🟢 PASS |
| | ピンの描画 | 地図上に登録済みハザードピンと自宅ピンが描画される | 🟢 PASS |
| | 座標未選択バリデーション | 地図未選択での送信時に「ちずを おして ばしょを えらんでね！」アラート | 🟢 PASS |
| | 編集権限の制御 | 自分の投稿にのみ「なおす📝」ボタンが表示される | 🟢 PASS |
| | 編集・キャンセル動作 | 編集開始でフォームに値が反映され、「やめる」で通常モードに戻る | 🟢 PASS |
| | コメント投稿 | コメント入力後に「おく」ボタン押下で即時反映される | 🟢 PASS |
| | カテゴリ選択 | ドロップダウンでの安全なカテゴリ切り替え | 🟢 PASS |
| [`LocationContext.test.tsx`](file:///C:/Users/denshi36/Desktop/maho/frontend/src/__tests__/LocationContext.test.tsx) | 方位角計算 (`calculateHeading`) | 同一点(0度)、真北(0度)、真東(90度)、真南(180度)、真西(270度)の大円方位角計算の検証 | 🟢 PASS |
| | アバター定義 (`AVATAR_OPTIONS`) | 全7種類（boy, girl, bike, car, cat, dog, robot）の属性完全性・子供向け絵文字/ラベル | 🟢 PASS |
| | useLocation デフォルト値 | Provider外での呼び出しでも例外クラッシュせず初期フォールバック値を返却 | 🟢 PASS |
| | アバター選択 & localStorage | デフォルト値、localStorageからの安全復元、不正値フォールバック、例外発生時の堅牢性 | 🟢 PASS |
| | 位置情報トラッキング & 移動判定 | watchPosition起動、位置・精度・履歴更新、1.5m以上移動時のisMoving判定/方位更新 | 🟢 PASS |
| | 履歴管理 & トラッキング停止 | clearHistoryによる履歴全消去、stopTrackingによるclearWatch実行と追跡停止 | 🟢 PASS |
| | アンマウント時クリーンアップ | コンポーネント破棄時にclearWatchが安全に呼び出されリソースリークを防止 | 🟢 PASS |
| | エラーハンドリング | PERMISSION_DENIED / POSITION_UNAVAILABLE / TIMEOUT / 非対応ブラウザ通知 | 🟢 PASS |
| | シミュレーション (`toggleSimulation`) | おさんぽデモの開始・800ms周期座標更新・停止とisMoving連動 | 🟢 PASS |
| [`types.test.ts`](file:///C:/Users/denshi36/Desktop/maho/frontend/src/__tests__/types.test.ts) | 全8カテゴリ定数 (`HAZARD_TYPES`) | 全8カテゴリ（Traffic, Crime, Disaster, Lighting, Shelter, AED, ChildSafety, Other）の漏れなき定義と重複なし8件検証 | 🟢 PASS |
| | カテゴリ型ガード (`isValidHazardType`) | 全8カテゴリでの有効性（true）および想定外文字列・小文字・空文字の安全な除外（false） | 🟢 PASS |
| | 危険度クランプ (`clampDangerLevel`) | 1〜5の数値保持、0/負値(Lv.1クランプ)、6以上(Lv.5クランプ)、小数四捨五入、数値文字列パース、無効入力時デフォルトLv.3返却 | 🟢 PASS |
| | ハザード型ガード (`isHazard`) | 必須プロパティ（id, lat, lng, type, description）充足検証、オプショナル・拡張プロパティ許容、null/undefined/型不正の安全な除外 | 🟢 PASS |
| | 関連インターフェース整合性 | Comment, AiAdvice, NearbyHazardsResponse, FeedbackItem の型定義整合性とプロパティアクセス検証 | 🟢 PASS |
| [`eslintConfig.test.ts`](file:///C:/Users/denshi36/Desktop/maho/frontend/src/__tests__/eslintConfig.test.ts) | Flat Config 形式検証 | 配列形式でのエクスポート、設定項目充足、プラグイン初期化検証 | 🟢 PASS |
| | globalIgnores 除外設定 | dist, coverage, node_modules の包括的除外パターン検証 | 🟢 PASS |
| | TypeScript 設定 & languageOptions | ts/tsx 対象設定ブロック、ECMAバージョン、ブラウザ globals (window等) の検証 | 🟢 PASS |
| | テスト・設定オーバーライド | テストファイル用 vitest/node globals、設定ファイル用 node globals の検証 | 🟢 PASS |
| | ESLint 実実行正常系 | 有効な TypeScript コードのプログラム的リント実行でエラー 0 件・警告 0 件検証 | 🟢 PASS |
| | アンダースコア変数許容 | `_` prefix 未使用引数/変数が警告・エラーにならないことの検証 | 🟢 PASS |
| | 構文エラー・リント違反検知 | 異常コードにおけるエラー検出能力の検証 | 🟢 PASS |

---

### 2. バックエンド (`backend/__tests__/`)

| テストファイル | 対象API・機能 | 検証内容 | 判定 |
| :--- | :--- | :--- | :---: |
| [`api.test.ts`](file:///C:/Users/denshi36/Desktop/maho/backend/__tests__/api.test.ts) | `GET /api/hazards` | 登録済みハザード一覧の正常取得 (200) | 🟢 PASS |
| | `POST /api/hazards` | 新規ハザード登録とID自動付番、ファイル永続化 (201) | 🟢 PASS |
| | `POST /api/hazards/:id/comments` | コメント追加とタイムスタンプ自動付与 (201) | 🟢 PASS |
| | `POST /api/hazards/:id/comments` | 空テキスト時の 400 エラーハンドリング | 🟢 PASS |
| | `POST /api/hazards/:id/comments` | 存在しないハザードIDに対する 404 エラー | 🟢 PASS |
| | `PUT /api/hazards/:id` | カテゴリ・説明文の正常更新 (200) | 🟢 PASS |
| | `PUT /api/hazards/:id` | 存在しないID更新時の 404 エラー | 🟢 PASS |
| | `DELETE /api/hazards/:id` | ハザードの解決（削除）とデータ整合性 (200) | 🟢 PASS |
| | `DELETE /api/hazards/:id` | 削除時に紐づく画像ファイルの自動クリーンアップ (BUG-007) | 🟢 PASS |
| | `POST /api/ai/analyze-hazard` | 投稿文からのAIカテゴリ・危険度自動判定 (BUG-009) | 🟢 PASS |
| | `POST /api/ai/advice` | 子供向けAI安全アドバイスの取得とプロパティ整合性 (BUG-008) | 🟢 PASS |
| | `GET /api/hazards/nearby` | 中心座標と半径指定による近傍ハザード取得・距離/徒歩時間算出・カテゴリ絞り込み・異常値400エラー | 🟢 PASS |
| | `POST /api/alerts/trigger` | 現在地からの接近アラート判定・highestLevel算出・必須パラメータ欠落400エラー | 🟢 PASS |
| | `GET /api/hazards/stats` | エリア危険度統計データ集計・カテゴリ別件数・リスク評価返却 | 🟢 PASS |
| | `GET / POST /api/feedback` | アプリ内フィードバックの安全な投稿および一覧取得 | 🟢 PASS |
| | `POST /api/hazards` | 不正座標指定時の 400 バリデーションエラーハンドリング | 🟢 PASS |
| [`storageService.test.ts`](file:///C:/Users/denshi36/Desktop/maho/backend/__tests__/storageService.test.ts) | `uploadImage` / `deleteImage` | JPEG/PNG/GIF/WEBP画像アップロード、マジックナンバー検証、FD解放、ファイル削除・パストラバーサル防御 | 🟢 PASS |

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
