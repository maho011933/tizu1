# みんなの安全マップ (Hazard Map) 🔰

子ども（小学生・未就学児）から保護者・地域の方まで、だれでも直感的に地域の危険情報を共有・確認できるWebアプリケーションです。

---

## 🌟 主な機能一覧

- 🗺️ **子ども向けイラスト風マップ＆動的マーカー**
  - 親しみやすいイラストピン＋絵文字アイコン（🚗 👮 🌊 🌙 🏫 💓 🐾）
  - 危険度（Lv.1〜5）に応じてピンの大きさが自動拡大、高危険度（Lv.4〜5）には赤点滅パルスアラート
  - 自分の投稿には「👑 じぶん」バッジを表示

- 🔍 **危険カテゴリ別の絞り込みフィルター**
  - 「ぜんぶ 🌈」「くるま 🚗」「ぼうはん 👮」「さいがい 🌊」「くらみち 🌙」「ひなんじょ 🏫」「AED 💓」「そのほか 🐾」をワンタップ切替
  - 各カテゴリのリアルタイム件数バッジ付き

- 🔥 **ヒートマップ表示機能 (Heatmap Layer)**
  - 危険度に応じた多重サーマルグラデーションサークル（Lv.5: 深紅3重、Lv.4: 橙2重、Lv.3: 黄、Lv.1〜2: 緑）
  - ヘッダーの「🔥 ヒートマップ」ボタンでワンタップON/OFF切替可能

- 🤖 **Gemini AI による自動解析＆あんぜんアドバイス**
  - 投稿テキストから危険度・カテゴリをAIが自動判別
  - 子どもにも分かりやすい「AIあんぜんアドバイス（ひらがな解説）」を自動生成

- 🚶 **現在地トラッキング＆PWA対応**
  - 現在地アイコンの歩行アニメーション・方位回転・アバター選択（7種類）
  - スマホのホーム画面に追加できるPWA（Progressive Web App）対応
  - 危険箇所への接近時のバックグラウンド追跡・音声・プッシュアラート

- 🏫 **オープンデータ連携（避難所・AED）**
  - 天童市のオープンデータを活用した避難所・AED・こども安心スポットの表示
  - 最寄りの避難所・AEDへのワンタップ案内

- 💬 **地域コメント＆写真投稿**
  - 各ハザード情報に子ども・保護者間でコメントを残せるコミュニケーション機能
  - 現地の写真を撮影・添付して投稿可能

---

## 🛠️ 技術スタック

- **フロントエンド**: React 19, TypeScript, Vite, React Leaflet (OpenStreetMap), `vite-plugin-pwa`
- **バックエンド**: Node.js, Express 5, TypeScript (`tsx`), Multer (画像アップロード)
- **テスト・品質管理**: Vitest, React Testing Library, Supertest, ESLint
- **CI/CD**: GitHub Actions (Node.js 24)
- **データストレージ**: JSONファイルデータベース (`backend/data/hazards.json`)

---

## 📚 関連ドキュメント

- [デザインガイドライン (DESIGN_GUIDELINE.md)](DESIGN_GUIDELINE.md): ひらがな表記ルール・カテゴリ配色・UIデザイン指針
- [ユーザーテスト実施キット (USER_TEST_KIT.md)](USER_TEST_KIT.md): 子ども・保護者向けテスト計画・アンケート質問票
- [ブランチ統合状況 (BRANCH_STATUS.md)](BRANCH_STATUS.md): ブランチ統合進捗・品質サマリー・機能仕様
- [バグ管理台帳 (BUG_TRACKING.md)](BUG_TRACKING.md): 検出バグの追跡・修正履歴・テストカバレッジマトリクス
- [タスク＆役割分担表 (tasks_and_roles.md)](tasks_and_roles.md): 8人チームの詳細タスク一覧・CI検証状況

---

## 🚀 開発・起動手順

### 1. バックエンドの起動
```bash
cd backend
npm install
npm run dev
```
バックエンドAPIサーバーが `http://localhost:3001` で起動します。

### 2. フロントエンドの起動
```bash
cd frontend
npm install
npm run dev
```
ブラウザで `http://localhost:5173` にアクセスしてください。

### 3. テストの実行
```bash
# バックエンドの型チェック・単体テスト
cd backend
npm run type-check
npm test

# フロントエンドのリント・テスト・ビルド
cd frontend
npm run lint
npm test
npm run build
```

---

## 📂 プロジェクト構造

```
.
├── .github/workflows/       # GitHub Actions CI/CD パイプライン
├── backend/
│   ├── __tests__/           # バックエンド自動テスト (Supertest/Vitest)
│   ├── data/hazards.json    # 危険箇所データ
│   ├── routes/              # 各種APIルーター (AI・オープンデータ・通知)
│   ├── uploads/             # 投稿写真保存フォルダ
│   ├── server.ts            # REST API サーバー
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── __tests__/       # フロントエンド自動テスト (Testing Library/Vitest)
│   │   ├── utils/           # マーカー・マップ計算ユーティリティ
│   │   ├── App.tsx          # メインアプリケーション
│   │   ├── App.css          # アニメーション＆スタイル
│   │   └── main.tsx
│   ├── index.html           # HTMLエントリーポイント
│   └── package.json
├── BRANCH_STATUS.md         # ブランチ統合・品質状況
├── BUG_TRACKING.md          # バグ管理＆テスト記録
├── tasks_and_roles.md       # タスク管理＆役割分担表
└── README.md                # 本ドキュメント
```