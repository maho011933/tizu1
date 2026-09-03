import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgrespassword@localhost:5432/safetymap';

export const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 3000,
  idleTimeoutMillis: 10000,
});

let dbConnected = false;

export function isDbConnected(): boolean {
  return dbConnected;
}

export interface HazardData {
  id: number;
  lat: number;
  lng: number;
  type: string;
  description: string;
  imageUrl?: string | null | undefined;
  comments?: Array<{ id: number; text: string; createdAt: string }> | undefined;
  distanceMeters?: number | undefined;
}

/**
 * 2点間の球面距離（メートル）をヒュベニ / ハバーサインの公式で計算（PostGIS未接続時のフォールバック用）
 */
export function calculateHaversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // 地球の半径（メートル）
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * データベース接続のテストと初期化
 */
export async function initializeDatabase(dataFile: string): Promise<boolean> {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL (PostGIS) に正常に接続しました。');
    dbConnected = true;

    // PostGIS 拡張とテーブルの作成
    await client.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS hazards (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        image_url TEXT,
        comments JSONB DEFAULT '[]'::jsonb,
        geom geometry(Point, 4326) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_hazards_geom ON hazards USING GIST (geom);
    `);

    // 既存の hazards テーブルのレコード数を確認
    const countRes = await client.query('SELECT COUNT(*) FROM hazards');
    const count = parseInt(countRes.rows[0]?.count || '0', 10);

    // 空の場合は hazards.json からデータをインポート
    if (count === 0 && fs.existsSync(dataFile)) {
      console.log('🔄 hazards.json から PostGIS テーブルへ初期データを移行中...');
      const fileData = fs.readFileSync(dataFile, 'utf8');
      const hazards: HazardData[] = JSON.parse(fileData);

      for (const h of hazards) {
        if (h.lat && h.lng) {
          await client.query(
            `INSERT INTO hazards (type, description, image_url, comments, geom)
             VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326))`,
            [
              h.type,
              h.description || '',
              h.imageUrl || null,
              JSON.stringify(h.comments || []),
              h.lng,
              h.lat
            ]
          );
        }
      }
      console.log(`✅ ${hazards.length} 件のデータを PostGIS に移行完了しました。`);
    }

    client.release();
    return true;
  } catch (err: any) {
    dbConnected = false;
    console.warn('⚠️ PostgreSQL (PostGIS) への接続に失敗しました。ローカルの hazards.json (フォールバックモード) で起動します。');
    console.warn(`   詳細: ${err.message}`);
    return false;
  }
}
