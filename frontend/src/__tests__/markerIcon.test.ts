import { describe, it, expect } from 'vitest';
import { getMarkerIcon, getHomeIcon, typeColors, typeLabels } from '../utils/mapUtils';

describe('Marker Icon & Color System (ピン表示・色設定テスト)', () => {
  describe('getMarkerIcon', () => {
    it('Traffic (交通) のピンアイコンが赤色 (#E74C3C) で生成されること', () => {
      const icon = getMarkerIcon('Traffic', false);
      expect(icon.options.html).toContain('background-color: #E74C3C');
      expect(icon.options.className).toBe('custom-icon');
    });

    it('Crime (防犯) のピンアイコンが水色 (#3498DB) で生成されること', () => {
      const icon = getMarkerIcon('Crime', false);
      expect(icon.options.html).toContain('background-color: #3498DB');
    });

    it('Disaster (災害) のピンアイコンが灰色 (#95A5A6) で生成されること', () => {
      const icon = getMarkerIcon('Disaster', false);
      expect(icon.options.html).toContain('background-color: #95A5A6');
    });

    it('Lighting (街灯・暗道) のピンアイコンが黄色 (#F1C40F) で生成されること', () => {
      const icon = getMarkerIcon('Lighting', false);
      expect(icon.options.html).toContain('background-color: #F1C40F');
    });

    it('Other (その他) のピンアイコンが紫色 (#9B59B6) で生成されること', () => {
      const icon = getMarkerIcon('Other', false);
      expect(icon.options.html).toContain('background-color: #9B59B6');
    });

    it('未知のカテゴリ名が渡された場合は Other (紫 #9B59B6) にフォールバックすること', () => {
      const icon = getMarkerIcon('UnknownCategory', false);
      expect(icon.options.html).toContain('background-color: #9B59B6');
    });

    it('自分の投稿 (isMine = true) の場合、金色の枠線 (#F1C40F) と「じぶん」バッジが表示されること', () => {
      const icon = getMarkerIcon('Traffic', true);
      expect(icon.options.html).toContain('border: 4px solid #F1C40F');
      expect(icon.options.html).toContain('じぶん');
    });

    it('他人の投稿 (isMine = false) の場合、白色の枠線で「じぶん」バッジが表示されないこと', () => {
      const icon = getMarkerIcon('Traffic', false);
      expect(icon.options.html).toContain('border: 4px solid white');
      expect(icon.options.html).not.toContain('じぶん');
    });
  });

  describe('getHomeIcon', () => {
    it('自宅アイコンに 🏠 絵文字と適切なスタイルが含まれること', () => {
      const homeIcon = getHomeIcon();
      expect(homeIcon.options.html).toContain('🏠');
      expect(homeIcon.options.html).toContain('background-color: #2C3E50');
      expect(homeIcon.options.className).toBe('home-icon');
    });
  });

  describe('GEMINI.md Rule Consistency (typeColors と typeLabels の整合性)', () => {
    it('全5カテゴリ (Traffic, Crime, Disaster, Lighting, Other) の配色定義が存在すること', () => {
      const expectedCategories = ['Traffic', 'Crime', 'Disaster', 'Lighting', 'Other'];
      expectedCategories.forEach(cat => {
        expect(typeColors).toHaveProperty(cat);
        expect(typeColors[cat].bg).toBeDefined();
        expect(typeColors[cat].text).toBeDefined();
        expect(typeColors[cat].shadow).toBeDefined();
      });
    });

    it('typeColors の背景色と getMarkerIcon の色が一致していること', () => {
      Object.keys(typeColors).forEach(cat => {
        const icon = getMarkerIcon(cat, false);
        expect(icon.options.html).toContain(`background-color: ${typeColors[cat].bg}`);
      });
    });

    it('全カテゴリに子供向けひらがなラベルが定義されていること', () => {
      expect(typeLabels.Traffic).toContain('くるま');
      expect(typeLabels.Crime).toContain('ぼうはん');
      expect(typeLabels.Disaster).toContain('じしん');
      expect(typeLabels.Lighting).toContain('くらみち');
      expect(typeLabels.Other).toContain('そのほか');
    });
  });
});
