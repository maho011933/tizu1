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

interface AppHazard {
  id: number;
  lat: number;
  lng: number;
  type: string;
  description: string;
  imageUrl?: string | null;
  comments?: Array<{ id: number; text: string; createdAt: string }>;
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

export function importTendoOpenData() {
  const geojsonPath = path.resolve(__dirname, '../data/opendata/tendo_hazards.geojson');
  const targetHazardsPath = path.resolve(__dirname, '../data/hazards.json');

  if (!fs.existsSync(geojsonPath)) {
    console.error(`❌ GeoJSON file not found: ${geojsonPath}`);
    return;
  }

  const geojsonData: GeoJSONCollection = JSON.parse(fs.readFileSync(geojsonPath, 'utf-8'));
  let currentHazards: AppHazard[] = [];

  if (fs.existsSync(targetHazardsPath)) {
    try {
      currentHazards = JSON.parse(fs.readFileSync(targetHazardsPath, 'utf-8'));
    } catch (e) {
      console.warn('⚠️ Could not parse existing hazards.json, starting with empty array.');
    }
  }

  let maxId = currentHazards.reduce((max, item) => Math.max(max, item.id || 0), 0);
  let importedCount = 0;

  for (const feature of geojsonData.features) {
    const [lng, lat] = feature.geometry.coordinates;
    const props = feature.properties;

    // Check if duplicate location already exists
    const isDuplicate = currentHazards.some(
      (h) => Math.abs(h.lat - lat) < 0.0001 && Math.abs(h.lng - lng) < 0.0001
    );

    if (isDuplicate) {
      console.log(`ℹ️ Skipping duplicate open data item: ${props.name}`);
      continue;
    }

    maxId += 1;
    const appType = mapCategoryToAppType(props.category_raw);
    const formattedDescription = `【${props.category_raw}】${props.name}\n${props.description_ja}`;

    const newHazard: AppHazard = {
      id: maxId,
      lat,
      lng,
      type: appType,
      description: formattedDescription,
      imageUrl: null,
      comments: [
        {
          id: 1,
          text: `出典: ${props.source}`,
          createdAt: new Date().toISOString()
        }
      ]
    };

    currentHazards.push(newHazard);
    importedCount += 1;
  }

  fs.writeFileSync(targetHazardsPath, JSON.stringify(currentHazards, null, 2), 'utf-8');
  console.log(`✅ Imported ${importedCount} Tendo City hazard open data records into ${targetHazardsPath}`);
}

importTendoOpenData();
