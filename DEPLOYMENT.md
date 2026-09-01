# ☁️ クラウドデプロイガイド (Deployment Guide)

本ドキュメントでは、「みんなの安全マップ」をクラウド環境（Render、AWS、GCPなど）へデプロイするための設定および自動デプロイ（CD）手順を説明します。

---

## 📑 構成概要

本プロジェクトは以下の 3 つのサービスで構成されています。
1. **Frontend**: React (Vite) 静的ホスティングまたはコンテナ
2. **Backend**: Express (Node.js) API サーバー
3. **Database**: PostgreSQL + PostGIS 空間データベース

---

## 🛠️ 1. Render.com を利用した簡単デプロイ (推奨)

リポジトリルートにある [`render.yaml`](file:///C:/Users/denshi15/Desktop/tizu1/render.yaml) を利用して、ワンクリックで 3 つのインフラを一括構築できます。

### 手順:
1. [Render.com](https://render.com/) にログインし、**Blueprints** 画面に移動します。
2. 本 GitHub リポジトリを連携します。
3. Render が自動的に `render.yaml` を読み込み、以下のリソースを生成します:
   - `me-safety-map-db` (PostgreSQL Database)
   - `me-safety-map-backend` (Node.js Web Service)
   - `me-safety-map-frontend` (Static Site)
4. デプロイ完了後、発行された URL でアクセスできます。

---

## 🔄 2. GitHub Actions による自動デプロイ (CD) 設定

[`.github/workflows/cd.yml`](file:///C:/Users/denshi15/Desktop/tizu1/.github/workflows/cd.yml) により、`main` または `master` ブランチへ Push された際、自動で型チェック・ビルド検証が行われ、クラウド環境へデプロイが通知されます。

### GitHub Secrets の設定手順:
1. GitHub リポジトリの **Settings > Secrets and variables > Actions** に移動します。
2. 以下の Secret を追加します:
   - `RENDER_DEPLOY_HOOK_URL`: Render の Deploy Hook URL (Service > Settings > Deploy Hook から取得)
   - `GENERIC_DEPLOY_HOOK_URL`: (任意) その他のクラウドサービスの Webhook URL

---

## 🐳 3. Docker コンテナを用いたデプロイ (AWS / GCP / VPS)

本リポジトリには [docker-compose.yml](file:///C:/Users/denshi15/Desktop/tizu1/docker-compose.yml) および各サービスの `Dockerfile` が用意されています。

```bash
# 本番環境用ビルドおよび起動
docker compose up -d --build
```
