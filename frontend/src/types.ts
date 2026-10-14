/**
 * みんなの安全マップ (Hazard Map) 共通型定義
 */

// 全8カテゴリの定義
export const HAZARD_TYPES = [
  'Traffic',
  'Crime',
  'Disaster',
  'Lighting',
  'Shelter',
  'AED',
  'ChildSafety',
  'Other',
] as const;

export type HazardType = (typeof HAZARD_TYPES)[number];

// 危険度レベル（1〜5）
export type DangerLevel = 1 | 2 | 3 | 4 | 5;

// 時間帯区分
export type TimeOfDay = 'morning' | 'noon' | 'evening' | 'night' | string;

// AIによる安全アドバイス
export interface AiAdvice {
  forKids?: string;
  forAdults?: string;
  advice?: string;
}

// 危険箇所へのコメント
export interface Comment {
  id: number;
  text: string;
  createdAt: string;
}

// 基本ハザード定義
export interface Hazard {
  id: number;
  lat: number;
  lng: number;
  type: HazardType | string;
  description: string;
  level?: number;
  dangerLevel?: number;
  timeOfDay?: TimeOfDay;
  imageUrl?: string | null;
  comments?: Comment[];
  aiAdvice?: AiAdvice;
  createdAt?: string;
  source?: string;
}

// 距離計算やナビゲーション情報が付与された拡張ハザード定義
export interface EnhancedHazard extends Hazard {
  distanceMeters?: number;
  walkTimeMinutes?: number;
}

// 近傍検索APIレスポンス
export interface NearbyHazardsResponse {
  count: number;
  center: { lat: number; lng: number };
  radiusMeters: number;
  hazards: EnhancedHazard[];
}

// フィードバックデータ
export interface FeedbackItem {
  id?: number;
  category: string;
  rating: number;
  comment: string;
  createdAt?: string;
}

// カテゴリカラー設定
export interface TypeColorConfig {
  bg: string;
  text: string;
  shadow: string;
}

/**
 * 型ガード・バリデーション関数
 */

// 有効なカテゴリかどうかの判定
export function isValidHazardType(type: string): type is HazardType {
  return (HAZARD_TYPES as readonly string[]).includes(type);
}

// 危険度レベル（1〜5）の安全なクランプ処理
export function clampDangerLevel(level: unknown): number {
  if (level === null || level === undefined || level === '' || typeof level === 'object') {
    return 3; // デフォルト Lv.3
  }
  const num = typeof level === 'number' ? level : Number(level);
  if (isNaN(num)) return 3; // デフォルト Lv.3
  return Math.max(1, Math.min(5, Math.round(num)));
}

// オブジェクトが Hazard の必須要件を満たすか判定する型ガード
export function isHazard(obj: unknown): obj is Hazard {
  if (typeof obj !== 'object' || obj === null) return false;
  const h = obj as Record<string, unknown>;
  return (
    typeof h.id === 'number' &&
    typeof h.lat === 'number' &&
    typeof h.lng === 'number' &&
    typeof h.type === 'string' &&
    typeof h.description === 'string'
  );
}
