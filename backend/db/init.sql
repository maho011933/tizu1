-- PostGIS 拡張の有効化
CREATE EXTENSION IF NOT EXISTS postgis;

-- 危険箇所（hazards）テーブル作成
CREATE TABLE IF NOT EXISTS hazards (
    id SERIAL PRIMARY KEY,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    location GEOMETRY(Point, 4326),
    type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT,
    danger_level INT DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- コメント（comments）テーブル作成
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    hazard_id INT REFERENCES hazards(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 空間検索を高速化するGiSTインデックスの作成
CREATE INDEX IF NOT EXISTS idx_hazards_location ON hazards USING GIST (location);

-- 初期データの投入（hazards.json のサンプルデータ移行）
INSERT INTO hazards (lat, lng, location, type, description, danger_level) VALUES
(35.6895, 139.6917, ST_SetSRID(ST_MakePoint(139.6917, 35.6895), 4326), 'Traffic', 'Narrow road with heavy traffic.', 4),
(35.6905, 139.6927, ST_SetSRID(ST_MakePoint(139.6927, 35.6905), 4326), 'Lighting', 'Very dark at night, no street lights.', 3),
(38.3228112833216, 140.3592109797584, ST_SetSRID(ST_MakePoint(140.3592109797584, 38.3228112833216), 4326), 'Lighting', '暗い', 3),
(38.32256393816334, 140.3590420036235, ST_SetSRID(ST_MakePoint(140.3590420036235, 38.32256393816334), 4326), 'Traffic', '車が多い', 4),
(38.322961790765035, 140.35932629465333, ST_SetSRID(ST_MakePoint(140.35932629465333, 38.322961790765035), 4326), 'Lighting', '暗い', 2);
