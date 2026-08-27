import type { HazardData } from './db.js';
import { calculateHaversineDistanceMeters } from './db.js';

export interface CategoryStat {
  type: string;
  label: string;
  count: number;
  percentage: number;
}

export interface AreaHotspot {
  id: string;
  centerLat: number;
  centerLng: number;
  count: number;
  riskScore: number; // 1 〜 5
  riskLevel: 'safe' | 'caution' | 'warning' | 'danger';
  riskBadge: string;
  dominantType: string;
  dominantTypeLabel: string;
  byType: Record<string, number>;
  childSummary: string;
}

export interface HazardStatisticsResponse {
  timestamp: string;
  scope: 'all' | 'radius_area';
  center?: { lat: number; lng: number } | undefined;
  radiusMeters?: number | undefined;
  totalHazards: number;
  totalComments: number;
  byCategory: CategoryStat[];
  hotspots: AreaHotspot[];
  overallRiskLevel: 'safe' | 'caution' | 'warning' | 'danger';
  overallSafetyBadge: string;
  adviceForKids: string;
  adviceForParents: string;
}

const TYPE_LABELS: Record<string, string> = {
  Traffic: 'くるま・こうつう 🚗',
  Crime: 'ふしんしゃ・ぼうはん 👮',
  Disaster: 'じしん・かじ・すいがい 🌊',
  Lighting: 'くらみち・でんき 🌙',
  Other: 'そのほか 🐾'
};

/**
 * 危険度スコア (1〜5) とラベルを計算
 */
function calculateRisk(count: number, byType: Record<string, number>): {
  score: number;
  level: 'safe' | 'caution' | 'warning' | 'danger';
  badge: string;
} {
  // 防犯・災害・交通は重み付け
  const weighted =
    (byType.Crime || 0) * 2.0 +
    (byType.Disaster || 0) * 2.0 +
    (byType.Traffic || 0) * 1.5 +
    (byType.Lighting || 0) * 1.0 +
    (byType.Other || 0) * 0.8;

  let score = 1;
  let level: 'safe' | 'caution' | 'warning' | 'danger' = 'safe';
  let badge = '🟢 あんしん エリア';

  if (count === 0) {
    return { score: 1, level: 'safe', badge: '🟢 あんしん エリア' };
  } else if (weighted <= 2) {
    score = 2;
    level = 'caution';
    badge = '🟡 すこし ちゅうい';
  } else if (weighted <= 5) {
    score = 3;
    level = 'warning';
    badge = '🟠 けいかい エリア';
  } else if (weighted <= 9) {
    score = 4;
    level = 'danger';
    badge = '🔴 きけん エリア';
  } else {
    score = 5;
    level = 'danger';
    badge = '🚨 とくべつけいかい エリア';
  }

  return { score, level, badge };
}

/**
 * 統計データとエリア別ホットスポット集計の生成
 */
export function generateHazardStatistics(
  allHazards: HazardData[],
  scopeParams?: { lat?: number | undefined; lng?: number | undefined; radius?: number | undefined; gridSize?: number | undefined }
): HazardStatisticsResponse {
  let targetHazards = allHazards;
  let isScoped = false;

  const lat = scopeParams?.lat;
  const lng = scopeParams?.lng;
  const radius = scopeParams?.radius;
  const gridSize = scopeParams?.gridSize || 0.005; // 約500mメッシュ

  // 指定半径内の絞り込み
  if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
    const rad = radius || 1000;
    targetHazards = allHazards.filter(h => {
      const dist = calculateHaversineDistanceMeters(lat, lng, h.lat, h.lng);
      return dist <= rad;
    });
    isScoped = true;
  }

  const totalHazards = targetHazards.length;
  let totalComments = 0;

  // カテゴリ別集計
  const typeCounts: Record<string, number> = {
    Traffic: 0,
    Crime: 0,
    Disaster: 0,
    Lighting: 0,
    Other: 0
  };

  for (const h of targetHazards) {
    totalComments += h.comments?.length || 0;
    const cat = h.type in typeCounts ? h.type : 'Other';
    typeCounts[cat] = (typeCounts[cat] || 0) + 1;
  }

  const byCategory: CategoryStat[] = Object.keys(typeCounts).map(type => ({
    type,
    label: TYPE_LABELS[type] || type,
    count: typeCounts[type] || 0,
    percentage: totalHazards > 0 ? Math.round(((typeCounts[type] || 0) / totalHazards) * 1000) / 10 : 0
  })).sort((a, b) => b.count - a.count);

  // グリッド / クラスタ集計 (エリアホットスポット)
  const gridMap = new Map<string, { lats: number[]; lngs: number[]; hazards: HazardData[] }>();

  for (const h of targetHazards) {
    const gridKeyX = Math.round(h.lat / gridSize) * gridSize;
    const gridKeyY = Math.round(h.lng / gridSize) * gridSize;
    const key = `${gridKeyX.toFixed(4)}_${gridKeyY.toFixed(4)}`;

    if (!gridMap.has(key)) {
      gridMap.set(key, { lats: [], lngs: [], hazards: [] });
    }
    const cell = gridMap.get(key)!;
    cell.lats.push(h.lat);
    cell.lngs.push(h.lng);
    cell.hazards.push(h);
  }

  const hotspots: AreaHotspot[] = [];
  let cellIndex = 1;

  for (const [key, cell] of gridMap.entries()) {
    const centerLat = Math.round((cell.lats.reduce((a, b) => a + b, 0) / cell.lats.length) * 10000) / 10000;
    const centerLng = Math.round((cell.lngs.reduce((a, b) => a + b, 0) / cell.lngs.length) * 10000) / 10000;

    const cellByType: Record<string, number> = {};
    for (const h of cell.hazards) {
      cellByType[h.type] = (cellByType[h.type] || 0) + 1;
    }

    let dominantType = 'Other';
    let maxCount = -1;
    for (const [t, c] of Object.entries(cellByType)) {
      if (c > maxCount) {
        maxCount = c;
        dominantType = t;
      }
    }

    const { score, level, badge } = calculateRisk(cell.hazards.length, cellByType);

    let childSummary = `あぶない ほうこくが ${cell.hazards.length}けん あるエリアです。`;
    if (dominantType === 'Traffic') {
      childSummary = `くるまに ちゅういしたい ばしょが ${cell.hazards.length}けん あります。みちを わたるときは みぎひだりを よくみよう！`;
    } else if (dominantType === 'Lighting') {
      childSummary = `くらくて あぶない みちが ${cell.hazards.length}けん あります。ゆうがたは あかるいみちを とおろう！`;
    } else if (dominantType === 'Crime') {
      childSummary = `ぼうはんに ちゅういしたい ばしょが ${cell.hazards.length}けん あります。ひとりであるかないようにしよう！`;
    } else if (dominantType === 'Disaster') {
      childSummary = `じしん・すいがいなど きけんな ばしょが ${cell.hazards.length}けん あります。ちかづかないようにしよう！`;
    }

    hotspots.push({
      id: `area-${cellIndex++}`,
      centerLat,
      centerLng,
      count: cell.hazards.length,
      riskScore: score,
      riskLevel: level,
      riskBadge: badge,
      dominantType,
      dominantTypeLabel: TYPE_LABELS[dominantType] || dominantType,
      byType: cellByType,
      childSummary
    });
  }

  // ホットスポットを危険度順（件数・リスクスコア降順）にソート
  hotspots.sort((a, b) => b.riskScore - a.riskScore || b.count - a.count);

  const overall = calculateRisk(totalHazards, typeCounts);

  let adviceForKids = 'みんなで まちの あんぜんを まもろう！あぶない ばしょを みつけたら おしえてね。';
  if (overall.level === 'danger') {
    adviceForKids = 'このちいきには あぶない ばしょが おおいです。おとなの ひとと いっしょにあるこう！';
  } else if (overall.level === 'warning') {
    adviceForKids = 'ちゅういする ばしょがあります。とびだしは ぜったいに しないでね！';
  }

  const topCategory = byCategory[0]?.label || 'なし';
  const adviceForParents = `最も報告が多いカテゴリは「${topCategory}」です。通学路やよく通る経路の安全確認をおすすめします。`;

  return {
    timestamp: new Date().toISOString(),
    scope: isScoped ? 'radius_area' : 'all',
    ...(isScoped ? { center: { lat: lat!, lng: lng! }, radiusMeters: radius || 1000 } : {}),
    totalHazards,
    totalComments,
    byCategory,
    hotspots,
    overallRiskLevel: overall.level,
    overallSafetyBadge: overall.badge,
    adviceForKids,
    adviceForParents
  };
}
