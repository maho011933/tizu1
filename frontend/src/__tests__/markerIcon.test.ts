import { describe, it, expect } from 'vitest';
import { getMarkerIcon, getHomeIcon, typeColors, typeLabels } from '../utils/mapUtils';

describe('Marker Icon & Color System (ピン表示・色設定テスト)', () => {
  describe('getMarkerIcon - カテゴリ別ピン色・アイコン生成', () => {
    it('Traffic (交通) のピンアイコンが赤色 (#E74C3C) と車絵文字 (🚗) で生成されること', () => {
      const icon = getMarkerIcon('Traffic', false);
      expect(icon.options.html).toContain('background-color: #E74C3C');
      expect(icon.options.html).toContain('🚗');
      expect(icon.options.className).toBe('custom-icon');
    });

    it('Crime (防犯) のピンアイコンが水色 (#3498DB) と警察官絵文字 (👮) で生成されること', () => {
      const icon = getMarkerIcon('Crime', false);
      expect(icon.options.html).toContain('background-color: #3498DB');
      expect(icon.options.html).toContain('👮');
    });

    it('Disaster (災害) のピンアイコンが灰色 (#95A5A6) と波絵文字 (🌊) で生成されること', () => {
      const icon = getMarkerIcon('Disaster', false);
      expect(icon.options.html).toContain('background-color: #95A5A6');
      expect(icon.options.html).toContain('🌊');
    });

    it('Lighting (街灯・暗道) のピンアイコンが黄色 (#F1C40F) と月絵文字 (🌙) で生成されること', () => {
      const icon = getMarkerIcon('Lighting', false);
      expect(icon.options.html).toContain('background-color: #F1C40F');
      expect(icon.options.html).toContain('🌙');
    });

    it('Shelter (避難所) のピンアイコンが緑色 (#2ECC71) と学校絵文字 (🏫) で生成されること', () => {
      const icon = getMarkerIcon('Shelter', false);
      expect(icon.options.html).toContain('background-color: #2ECC71');
      expect(icon.options.html).toContain('🏫');
    });

    it('AED (救急) のピンアイコンがオレンジ色 (#E67E22) とハート絵文字 (💓) で生成されること', () => {
      const icon = getMarkerIcon('AED', false);
      expect(icon.options.html).toContain('background-color: #E67E22');
      expect(icon.options.html).toContain('💓');
    });

    it('ChildSafety (こども安心スポット) のピンアイコンが青緑色 (#1ABC9C) と家絵文字 (🏠) で生成されること', () => {
      const icon = getMarkerIcon('ChildSafety', false);
      expect(icon.options.html).toContain('background-color: #1ABC9C');
      expect(icon.options.html).toContain('🏠');
    });

    it('Other (その他) のピンアイコンが紫色 (#9B59B6) と肉球絵文字 (🐾) で生成されること', () => {
      const icon = getMarkerIcon('Other', false);
      expect(icon.options.html).toContain('background-color: #9B59B6');
      expect(icon.options.html).toContain('🐾');
    });

    it('未知のカテゴリ名が渡された場合は Other (紫 #9B59B6, 🐾) にフォールバックすること', () => {
      const icon = getMarkerIcon('UnknownCategory', false);
      expect(icon.options.html).toContain('background-color: #9B59B6');
      expect(icon.options.html).toContain('🐾');
    });
  });

  describe('getMarkerIcon - 投稿者フラグ (isMine) とバッジ表示', () => {
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

  describe('getMarkerIcon - 危険度 (level 1〜5) に応じた動的サイズと視覚効果', () => {
    it('デフォルトの危険度は Lv.3 (38px, Lv.3バッジ) で生成されること', () => {
      const icon = getMarkerIcon('Traffic', false);
      expect(icon.options.iconSize).toEqual([38, 38]);
      expect(icon.options.iconAnchor).toEqual([19, 19]);
      expect(icon.options.html).toContain('width: 38px');
      expect(icon.options.html).toContain('height: 38px');
      expect(icon.options.html).toContain('font-size: 20px');
      expect(icon.options.html).toContain('Lv.3');
      expect(icon.options.html).toContain('background: #F39C12'); // Lv.3は橙色バッジ
    });

    it('Lv.1 の場合、最小サイズ (24px, font-size 12px, 灰色バッジ) で生成されること', () => {
      const icon = getMarkerIcon('Traffic', false, 1);
      expect(icon.options.iconSize).toEqual([24, 24]);
      expect(icon.options.iconAnchor).toEqual([12, 12]);
      expect(icon.options.html).toContain('width: 24px');
      expect(icon.options.html).toContain('height: 24px');
      expect(icon.options.html).toContain('font-size: 12px');
      expect(icon.options.html).toContain('Lv.1');
      expect(icon.options.html).toContain('background: #7F8C8D');
      expect(icon.options.html).not.toContain('pulse-marker');
      expect(icon.options.html).not.toContain('alert-marker');
    });

    it('Lv.2 の場合、30px (font-size 15px, 灰色バッジ) で生成されること', () => {
      const icon = getMarkerIcon('Traffic', false, 2);
      expect(icon.options.iconSize).toEqual([30, 30]);
      expect(icon.options.iconAnchor).toEqual([15, 15]);
      expect(icon.options.html).toContain('width: 30px');
      expect(icon.options.html).toContain('height: 30px');
      expect(icon.options.html).toContain('font-size: 15px');
      expect(icon.options.html).toContain('Lv.2');
      expect(icon.options.html).toContain('background: #7F8C8D');
    });

    it('Lv.4 の場合、大サイズ (48px, font-size 25px, 赤色バッジ, pulse-markerクラス) で生成されること', () => {
      const icon = getMarkerIcon('Traffic', false, 4);
      expect(icon.options.iconSize).toEqual([48, 48]);
      expect(icon.options.iconAnchor).toEqual([24, 24]);
      expect(icon.options.html).toContain('width: 48px');
      expect(icon.options.html).toContain('height: 48px');
      expect(icon.options.html).toContain('font-size: 25px');
      expect(icon.options.html).toContain('Lv.4');
      expect(icon.options.html).toContain('background: #E74C3C');
      expect(icon.options.html).toContain('pulse-marker');
      expect(icon.options.html).not.toContain('alert-marker');
    });

    it('Lv.5 の場合、最大サイズ (58px, font-size 30px, 赤色バッジ, alert-markerクラス) で生成されること', () => {
      const icon = getMarkerIcon('Traffic', false, 5);
      expect(icon.options.iconSize).toEqual([58, 58]);
      expect(icon.options.iconAnchor).toEqual([29, 29]);
      expect(icon.options.html).toContain('width: 58px');
      expect(icon.options.html).toContain('height: 58px');
      expect(icon.options.html).toContain('font-size: 30px');
      expect(icon.options.html).toContain('Lv.5');
      expect(icon.options.html).toContain('background: #E74C3C');
      expect(icon.options.html).toContain('alert-marker');
    });

    it('範囲外の危険度 (0以下または6以上) が渡された場合も安全にクランプされること', () => {
      const iconUnder = getMarkerIcon('Traffic', false, 0);
      expect(iconUnder.options.iconSize).toEqual([38, 38]); // 0はデフォルト3へフォールバック

      const iconOver = getMarkerIcon('Traffic', false, 99);
      expect(iconOver.options.iconSize).toEqual([58, 58]); // 最大値インデックス4(58px)にクランプ
    });
  });

  describe('getHomeIcon - 自宅ピン表示', () => {
    it('自宅アイコンに 🏠 絵文字、適切なスタイル、正しいサイズとアンカーが含まれること', () => {
      const homeIcon = getHomeIcon();
      expect(homeIcon.options.html).toContain('🏠');
      expect(homeIcon.options.html).toContain('background-color: #2C3E50');
      expect(homeIcon.options.className).toBe('home-icon');
      expect(homeIcon.options.iconSize).toEqual([36, 36]);
      expect(homeIcon.options.iconAnchor).toEqual([18, 18]);
    });
  });

  describe('GEMINI.md Rule Consistency (全8カテゴリの配色とひらがなラベル整合性)', () => {
    const allCategories = ['Traffic', 'Crime', 'Disaster', 'Lighting', 'Shelter', 'AED', 'ChildSafety', 'Other'];

    it('全8カテゴリの配色定義 (bg, text, shadow) が typeColors に存在すること', () => {
      allCategories.forEach(cat => {
        expect(typeColors).toHaveProperty(cat);
        expect(typeColors[cat].bg).toBeDefined();
        expect(typeColors[cat].text).toBeDefined();
        expect(typeColors[cat].shadow).toBeDefined();
      });
    });

    it('typeColors の背景色と getMarkerIcon のピン背景色が全8カテゴリで一致していること', () => {
      allCategories.forEach(cat => {
        const icon = getMarkerIcon(cat, false);
        expect(icon.options.html).toContain(`background-color: ${typeColors[cat].bg}`);
      });
    });

    it('全8カテゴリに子供向けひらがなラベル・絵文字が typeLabels に定義されていること', () => {
      expect(typeLabels.Traffic).toContain('くるま');
      expect(typeLabels.Crime).toContain('ぼうはん');
      expect(typeLabels.Disaster).toContain('じしん');
      expect(typeLabels.Lighting).toContain('くらみち');
      expect(typeLabels.Shelter).toContain('ひなんじょ');
      expect(typeLabels.AED).toContain('きゅうきゅう');
      expect(typeLabels.ChildSafety).toContain('こどもあんしん');
      expect(typeLabels.Other).toContain('そのほか');
    });

    it('typeLabels と typeColors のキーセットが完全一致していること', () => {
      const colorKeys = Object.keys(typeColors).sort();
      const labelKeys = Object.keys(typeLabels).sort();
      expect(colorKeys).toEqual(labelKeys);
      expect(colorKeys).toEqual(allCategories.slice().sort());
    });
  });
});
