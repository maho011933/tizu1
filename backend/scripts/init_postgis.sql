-- PostGIS データベース初期化＆テーブル定義 SQL

-- 1. PostGIS 拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. hazards (危険箇所・避難所・ハザード) テーブルの作成
CREATE TABLE IF NOT EXISTS hazards (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(100) UNIQUE, -- オープンデータの識別ID (例: TENDO-DIS-001)
    type VARCHAR(50) NOT NULL,      -- カテゴリ (Traffic, Crime, Disaster, Lighting, Shelter, Other)
    name VARCHAR(255) NOT NULL,      -- 名称 (例: 倉津川周辺 浸水想定エリア)
    city VARCHAR(100) DEFAULT '天童市', -- 市区町村名
    district VARCHAR(100),           -- 地区・町名
    hazard_level INT DEFAULT 1,     -- 危険度 (1: 安全/避難所 ~ 5: 特別警戒)
    description TEXT,               -- ひらがな多めの説明テキスト
    source VARCHAR(255),            -- 出典 (オープンデータ名等)
    image_url VARCHAR(500),         -- 写真URL
    
    -- 空間データ (WGS84 緯度経度 4326)
    lat DOUBLE PRECISION NOT NULL,  -- 緯度
    lng DOUBLE PRECISION NOT NULL,  -- 経度
    location GEOMETRY(Point, 4326), -- PostGIS 空間ポイントオブジェクト

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. PostGIS GIST 空間インデックスの作成 (高速な半径ジオクエリ ST_DWithin 用)
CREATE INDEX IF NOT EXISTS idx_hazards_location ON hazards USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_hazards_type ON hazards(type);

-- 4. 自動更新トリガーの設定
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_hazards_updated_at ON hazards;
CREATE TRIGGER update_hazards_updated_at
BEFORE UPDATE ON hazards
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
