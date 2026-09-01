-- PostGIS 拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS postgis;

-- 危険箇所テーブルの作成
CREATE TABLE IF NOT EXISTS hazards (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT,
    comments JSONB DEFAULT '[]'::jsonb,
    geom geometry(Point, 4326) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 空間検索用 GiST インデックス
CREATE INDEX IF NOT EXISTS idx_hazards_geom ON hazards USING GIST (geom);
