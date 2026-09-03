import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FeatureProperties {
  id: string;
  category_raw: string;
  name: string;
  city: string;
  district: string;
  hazard_level?: number;
  description_ja: string;
  source: string;
}

interface GeoJSONFeature {
  type: string;
  properties: FeatureProperties;
  geometry: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
}

interface GeoJSONCollection {
  type: string;
  features: GeoJSONFeature[];
}

function mapCategoryToAppType(categoryRaw: string): string {
  if (categoryRaw.includes('AED') || categoryRaw.includes('救急') || categoryRaw.includes('きゅうきゅう')) {
    return 'AED';
  }
  if (categoryRaw.includes('避難') || categoryRaw.includes('ひなん')) {
    return 'Shelter';
  }
  if (categoryRaw.includes('洪水') || categoryRaw.includes('土砂') || categoryRaw.includes('災害')) {
    return 'Disaster';
  }
  if (categoryRaw.includes('交通') || categoryRaw.includes('通学路') || categoryRaw.includes('事故')) {
    return 'Traffic';
  }
  if (categoryRaw.includes('防犯') || categoryRaw.includes('不審者') || categoryRaw.includes('警察') || categoryRaw.includes('110番')) {
    return 'Crime';
  }
  if (categoryRaw.includes('街灯') || categoryRaw.includes('暗')) {
    return 'Lighting';
  }
  return 'Other';
}

function escapeSqlString(str: string | undefined | null): string {
  if (!str) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

export async function runPostgisETL() {
  console.log('🚀 Starting PostGIS ETL Process...');

  const geojsonPath = path.resolve(__dirname, '../data/opendata/tendo_hazards.geojson');
  const sqlOutputPath = path.resolve(__dirname, '../data/insert_hazards_postgis.sql');

  if (!fs.existsSync(geojsonPath)) {
    console.error(`❌ Source GeoJSON file not found: ${geojsonPath}`);
    return;
  }

  const geojsonData: GeoJSONCollection = JSON.parse(fs.readFileSync(geojsonPath, 'utf-8'));
  console.log(`📦 Extracted ${geojsonData.features.length} records from GeoJSON.`);

  let sqlStatements: string[] = [];
  sqlStatements.push('-- Auto-generated PostGIS ETL Import Script');
  sqlStatements.push('-- Source: tendo_hazards.geojson\n');

  for (const feature of geojsonData.features) {
    const [lng, lat] = feature.geometry.coordinates;
    const props = feature.properties;
    const appType = mapCategoryToAppType(props.category_raw);
    const hazardLevel = props.hazard_level || 1;

    const sql = `INSERT INTO hazards (external_id, type, name, city, district, hazard_level, description, source, lat, lng, location)
VALUES (
  ${escapeSqlString(props.id)},
  ${escapeSqlString(appType)},
  ${escapeSqlString(props.name)},
  ${escapeSqlString(props.city || '天童市')},
  ${escapeSqlString(props.district)},
  ${hazardLevel},
  ${escapeSqlString(props.description_ja)},
  ${escapeSqlString(props.source)},
  ${lat},
  ${lng},
  ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
)
ON CONFLICT (external_id) DO UPDATE SET
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  district = EXCLUDED.district,
  hazard_level = EXCLUDED.hazard_level,
  description = EXCLUDED.description,
  source = EXCLUDED.source,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  location = EXCLUDED.location,
  updated_at = NOW();`;

    sqlStatements.push(sql);
  }

  // Write output SQL file
  fs.writeFileSync(sqlOutputPath, sqlStatements.join('\n\n'), 'utf-8');
  console.log(`✅ Generated PostGIS SQL Dump: ${sqlOutputPath}`);

  // Optional: Connect to Postgres DB if pg and DATABASE_URL are available
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (databaseUrl) {
    try {
      console.log('🔌 Connecting to PostgreSQL/PostGIS database...');
      // Dynamic import of pg if installed
      const pgModule = await import('pg');
      const { Client } = pgModule.default || pgModule;
      const client = new Client({ connectionString: databaseUrl });
      await client.connect();

      // Read init SQL schema first
      const schemaSqlPath = path.resolve(__dirname, 'init_postgis.sql');
      if (fs.existsSync(schemaSqlPath)) {
        const schemaSql = fs.readFileSync(schemaSqlPath, 'utf-8');
        await client.query(schemaSql);
        console.log('✅ PostGIS Schema Initialized.');
      }

      // Execute generated INSERT SQL
      for (const statement of sqlStatements) {
        if (statement.trim().startsWith('INSERT')) {
          await client.query(statement);
        }
      }

      await client.end();
      console.log('🎉 Successfully loaded all records into PostGIS database!');
    } catch (err: any) {
      console.warn(`⚠️ DB Auto-load skipped or failed: ${err.message}`);
      console.log(`💡 You can execute the generated SQL file using psql: psql $DATABASE_URL -f ${sqlOutputPath}`);
    }
  } else {
    console.log(`💡 PostGIS SQL file ready. To load into DB, run: psql <connection_string> -f "${sqlOutputPath}"`);
  }
}

runPostgisETL();
