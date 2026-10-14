import { describe, it, expect } from 'vitest';
import {
  HAZARD_TYPES,
  isValidHazardType,
  clampDangerLevel,
  isHazard,
  type Hazard,
  type EnhancedHazard,
  type Comment,
  type AiAdvice,
  type NearbyHazardsResponse,
  type FeedbackItem,
} from '../types';

describe('types.ts - 型定義および型ガード・ユーティリティ検証', () => {
  describe('HAZARD_TYPES 定数定義', () => {
    it('全8カテゴリが漏れなく定義されていること', () => {
      expect(HAZARD_TYPES).toContain('Traffic');
      expect(HAZARD_TYPES).toContain('Crime');
      expect(HAZARD_TYPES).toContain('Disaster');
      expect(HAZARD_TYPES).toContain('Lighting');
      expect(HAZARD_TYPES).toContain('Shelter');
      expect(HAZARD_TYPES).toContain('AED');
      expect(HAZARD_TYPES).toContain('ChildSafety');
      expect(HAZARD_TYPES).toContain('Other');
    });

    it('カテゴリ定義に重複がなくちょうど8件であること', () => {
      expect(HAZARD_TYPES.length).toBe(8);
      const uniqueTypes = new Set(HAZARD_TYPES);
      expect(uniqueTypes.size).toBe(8);
    });
  });

  describe('isValidHazardType (カテゴリ型ガード)', () => {
    it('定義済みの全8カテゴリに対して true を返すこと', () => {
      for (const t of HAZARD_TYPES) {
        expect(isValidHazardType(t)).toBe(true);
      }
    });

    it('未定義のカテゴリ文字列に対して false を返すこと', () => {
      expect(isValidHazardType('Unknown')).toBe(false);
      expect(isValidHazardType('')).toBe(false);
      expect(isValidHazardType('traffic')).toBe(false); // 大文字小文字の区別
      expect(isValidHazardType('Hospital')).toBe(false);
      expect(isValidHazardType('123')).toBe(false);
    });
  });

  describe('clampDangerLevel (危険度クランプ処理)', () => {
    it('有効範囲 1〜5 の整数はそのまま返却されること', () => {
      expect(clampDangerLevel(1)).toBe(1);
      expect(clampDangerLevel(2)).toBe(2);
      expect(clampDangerLevel(3)).toBe(3);
      expect(clampDangerLevel(4)).toBe(4);
      expect(clampDangerLevel(5)).toBe(5);
    });

    it('1未満の数値は最小値 1 にクランプされること', () => {
      expect(clampDangerLevel(0)).toBe(1);
      expect(clampDangerLevel(-5)).toBe(1);
      expect(clampDangerLevel(-999)).toBe(1);
    });

    it('5より大きい数値は最大値 5 にクランプされること', () => {
      expect(clampDangerLevel(6)).toBe(5);
      expect(clampDangerLevel(10)).toBe(5);
      expect(clampDangerLevel(100)).toBe(5);
    });

    it('小数値は四捨五入されて範囲内にクランプされること', () => {
      expect(clampDangerLevel(3.2)).toBe(3);
      expect(clampDangerLevel(3.7)).toBe(4);
      expect(clampDangerLevel(0.4)).toBe(1);
      expect(clampDangerLevel(5.8)).toBe(5);
    });

    it('数値形式の文字列も安全にパース・クランプされること', () => {
      expect(clampDangerLevel('4')).toBe(4);
      expect(clampDangerLevel('1')).toBe(1);
      expect(clampDangerLevel('10')).toBe(5);
      expect(clampDangerLevel('-2')).toBe(1);
    });

    it('無効な入力（NaN, 不正文字列, null, undefined）時はデフォルト Lv.3 を返すこと', () => {
      expect(clampDangerLevel(NaN)).toBe(3);
      expect(clampDangerLevel('invalid')).toBe(3);
      expect(clampDangerLevel(null)).toBe(3);
      expect(clampDangerLevel(undefined)).toBe(3);
      expect(clampDangerLevel({})).toBe(3);
    });
  });

  describe('isHazard (Hazard型ガード)', () => {
    it('完全な必須フィールドを持つオブジェクトで true を返すこと', () => {
      const valid: Hazard = {
        id: 1,
        lat: 38.3582,
        lng: 140.3705,
        type: 'Traffic',
        description: '道が狭くて危険',
      };
      expect(isHazard(valid)).toBe(true);
    });

    it('オプショナルフィールドを含む拡張オブジェクトでも true を返すこと', () => {
      const full: EnhancedHazard = {
        id: 2,
        lat: 38.356,
        lng: 140.371,
        type: 'Disaster',
        description: '大雨時冠水注意',
        level: 4,
        dangerLevel: 4,
        timeOfDay: 'evening',
        imageUrl: '/uploads/sample.jpg',
        comments: [{ id: 10, text: '注意報が出ているよ', createdAt: '2026-10-14' }],
        aiAdvice: { forKids: 'ちかづかないでね', forAdults: '迂回してください' },
        createdAt: '2026-10-14T09:00:00Z',
        distanceMeters: 250,
        walkTimeMinutes: 3,
        source: 'user',
      };
      expect(isHazard(full)).toBe(true);
    });

    it('null, undefined, プリミティブ値では false を返すこと', () => {
      expect(isHazard(null)).toBe(false);
      expect(isHazard(undefined)).toBe(false);
      expect(isHazard('string')).toBe(false);
      expect(isHazard(123)).toBe(false);
      expect(isHazard(true)).toBe(false);
      expect(isHazard([])).toBe(false);
    });

    it('必須プロパティが欠落している場合は false を返すこと', () => {
      expect(isHazard({ id: 1, lat: 38.0, lng: 140.0, type: 'Traffic' })).toBe(false); // description 欠落
      expect(isHazard({ id: 1, lat: 38.0, lng: 140.0, description: '危険' })).toBe(false); // type 欠落
      expect(isHazard({ id: 1, lng: 140.0, type: 'Traffic', description: '危険' })).toBe(false); // lat 欠落
      expect(isHazard({ id: 1, lat: 38.0, type: 'Traffic', description: '危険' })).toBe(false); // lng 欠落
      expect(isHazard({ lat: 38.0, lng: 140.0, type: 'Traffic', description: '危険' })).toBe(false); // id 欠落
    });

    it('プロパティの型が不正な場合は false を返すこと', () => {
      expect(isHazard({ id: '1', lat: 38.0, lng: 140.0, type: 'Traffic', description: '危険' })).toBe(false); // id が string
      expect(isHazard({ id: 1, lat: '38.0', lng: 140.0, type: 'Traffic', description: '危険' })).toBe(false); // lat が string
      expect(isHazard({ id: 1, lat: 38.0, lng: '140.0', type: 'Traffic', description: '危険' })).toBe(false); // lng が string
      expect(isHazard({ id: 1, lat: 38.0, lng: 140.0, type: 123, description: '危険' })).toBe(false); // type が number
      expect(isHazard({ id: 1, lat: 38.0, lng: 140.0, type: 'Traffic', description: 123 })).toBe(false); // description が number
    });
  });

  describe('関連インターフェースの構造検証', () => {
    it('Comment インターフェースの整合性', () => {
      const comment: Comment = {
        id: 1,
        text: '気をつけてね',
        createdAt: '2026-10-14T10:00:00Z',
      };
      expect(comment.id).toBe(1);
      expect(comment.text).toBe('気をつけてね');
      expect(comment.createdAt).toBeDefined();
    });

    it('AiAdvice インターフェースの整合性', () => {
      const advice: AiAdvice = {
        forKids: 'てを つないで あるこう！',
        forAdults: '歩道が狭いため注意が必要です。',
        advice: '総合アドバイス',
      };
      expect(advice.forKids).toContain('あるこう');
      expect(advice.forAdults).toContain('注意');
      expect(advice.advice).toBe('総合アドバイス');
    });

    it('NearbyHazardsResponse インターフェースの整合性', () => {
      const response: NearbyHazardsResponse = {
        count: 1,
        center: { lat: 38.3582, lng: 140.3705 },
        radiusMeters: 500,
        hazards: [
          {
            id: 1,
            lat: 38.3585,
            lng: 140.3708,
            type: 'Traffic',
            description: '見通しの悪い交差点',
            distanceMeters: 50,
            walkTimeMinutes: 1,
          },
        ],
      };
      expect(response.count).toBe(1);
      expect(response.hazards.length).toBe(1);
      expect(response.hazards[0].distanceMeters).toBe(50);
    });

    it('FeedbackItem インターフェースの整合性', () => {
      const feedback: FeedbackItem = {
        id: 101,
        category: 'UI/UX',
        rating: 5,
        comment: 'ひらがなで使いやすいです！',
        createdAt: '2026-10-14T12:00:00Z',
      };
      expect(feedback.rating).toBe(5);
      expect(feedback.category).toBe('UI/UX');
    });
  });
});
