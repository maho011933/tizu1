import L from 'leaflet';

export const getMarkerIcon = (type: string, isMine: boolean = false, level: number = 3) => {
  const colors: Record<string, string> = {
    Traffic: '#E74C3C', // 赤
    Crime: '#3498DB',   // 水色
    Disaster: '#95A5A6', // 灰色
    Lighting: '#F1C40F', // 黄色
    Shelter: '#2ECC71',  // 緑
    AED: '#E67E22',      // オレンジ
    ChildSafety: '#1ABC9C', // 青緑
    Other: '#9B59B6'     // 紫
  };
  const emojis: Record<string, string> = {
    Traffic: '🚗',
    Crime: '👮',
    Disaster: '🌊',
    Lighting: '🌙',
    Shelter: '🏫',
    AED: '💓',
    ChildSafety: '🏠',
    Other: '🐾'
  };

  const color = colors[type] || colors.Other;
  const emoji = emojis[type] || emojis.Other;
  const borderColor = isMine ? '#F1C40F' : 'white';

  // 危険度 Lv.1〜5 に応じたサイズ設定
  // Lv.1: 24px, Lv.2: 28px, Lv.3: 34px, Lv.4: 42px, Lv.5: 50px
  const sizes = [24, 28, 34, 42, 50];
  const fontSizes = [12, 14, 18, 22, 26];
  const idx = Math.max(0, Math.min(4, (level || 3) - 1));
  const pinSize = sizes[idx];
  const fontSize = fontSizes[idx];

  const alertBadge = level >= 4 ? `<div style="position: absolute; top: -14px; right: -8px; background: #E74C3C; color: white; font-size: 10px; font-weight: 900; padding: 1px 4px; border-radius: 8px; border: 1.5px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); z-index: 5;">Lv.${level}</div>` : '';

  return L.divIcon({
    className: 'custom-icon',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        <div class="${level === 5 ? 'alert-marker' : (level === 4 ? 'pulse-marker' : '')}" style="background-color: ${color}; width: ${pinSize}px; height: ${pinSize}px; border-radius: 50%; border: 4px solid ${borderColor}; box-shadow: 0 3px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: ${fontSize}px; transition: all 0.2s ease;">
          ${emoji}
        </div>
        ${alertBadge}
        ${isMine ? '<div style="position: absolute; top: -15px; left: 50%; transform: translateX(-50%); background: #F1C40F; color: #2C3E50; font-size: 10px; font-weight: bold; padding: 1px 4px; border-radius: 4px; white-space: nowrap; border: 1px solid white; z-index: 4;">じぶん</div>' : ''}
      </div>
    `,
    iconSize: [pinSize, pinSize],
    iconAnchor: [pinSize / 2, pinSize / 2],
  });
};

export const getHomeIcon = () => {
  return L.divIcon({
    className: 'home-icon',
    html: `<div style="background-color: #2C3E50; width: 36px; height: 36px; border-radius: 50%; border: 4px solid white; box-shadow: 0 3px 10px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-size: 20px;">🏠</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

export const typeLabels: Record<string, string> = {
  Traffic: 'くるま・こうつう 🚗',
  Crime: 'ふしんしゃ・ぼうはん 👮',
  Disaster: 'じしん・かじ 🌊',
  Lighting: 'くらみち・でんき 🌙',
  Shelter: 'ひなんじょ 🏫',
  AED: 'AED・きゅうきゅう 💓',
  Other: 'そのほか 🐾'
};

export const typeColors: Record<string, { bg: string; text: string; shadow: string }> = {
  Traffic: { bg: '#E74C3C', text: 'white', shadow: '#C0392B' },
  Crime: { bg: '#3498DB', text: 'white', shadow: '#2980B9' },
  Disaster: { bg: '#95A5A6', text: 'white', shadow: '#7F8C8D' },
  Lighting: { bg: '#F1C40F', text: '#2C3E50', shadow: '#F39C12' },
  Shelter: { bg: '#2ECC71', text: 'white', shadow: '#27AE60' },
  AED: { bg: '#E67E22', text: 'white', shadow: '#D35400' },
  Other: { bg: '#9B59B6', text: 'white', shadow: '#8E44AD' }
};
