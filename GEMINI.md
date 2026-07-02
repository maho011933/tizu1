# Project: みんなの安全マップ (Hazard Map)

## Conventions
- **Language**: 日本語 (User communication), TypeScript (Code)
- **UI/UX**: 子供でも分かりやすい、ひらがな多めの親しみやすいUI。
- **Styling**: 基本は `App.tsx` 内のインラインスタイル、補助的に `App.css` を使用。

## Architecture
- **Backend**: Expressを使用。データは `backend/data/hazards.json` に保存。画像は `backend/uploads/`。
- **Frontend**: `react-leaflet` を地図ライブラリとして使用。

## Specific Rules
- カテゴリの色分けは `App.tsx` 内の `typeColors` および `getMarkerIcon` で定義されたものに従うこと。
- 新しいカテゴリを追加する場合は、ボタンとマーカーの両方の色をセットで設定すること。
