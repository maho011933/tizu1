import L from 'leaflet';

export const getMarkerIcon = (type: string, isMine: boolean = false) => {
  const colors: Record<string, string> = {
    Traffic: '#E74C3C', // 赤
    Crime: '#3498DB',   // 水色
    Disaster: '#95A5A6', // 灰色
    Lighting: '#F1C40F', // 黄色
    Other: '#9B59B6'     // 紫
  };
  const color = colors[type] || colors.Other;
  const borderColor = isMine ? '#F1C40F' : 'white'; // 自分の投稿は金色の枠

  return L.divIcon({
    className: 'custom-icon',
    html: `
      <div style="position: relative;">
        <div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 4px solid ${borderColor}; box-shadow: 0 3px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 14px;"></div>
        ${isMine ? '<div style="position: absolute; top: -15px; left: 50%; transform: translateX(-50%); background: #F1C40F; color: #2C3E50; font-size: 10px; font-weight: bold; padding: 1px 4px; border-radius: 4px; white-space: nowrap; border: 1px solid white;">じぶん</div>' : ''}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
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
  Other: 'そのほか 🐾'
};

export const typeColors: Record<string, { bg: string; text: string; shadow: string }> = {
  Traffic: { bg: '#E74C3C', text: 'white', shadow: '#C0392B' },     // 赤
  Crime: { bg: '#3498DB', text: 'white', shadow: '#2980B9' },       // 水色
  Disaster: { bg: '#95A5A6', text: 'white', shadow: '#7F8C8D' },    // 灰色
  Lighting: { bg: '#F1C40F', text: '#2C3E50', shadow: '#F39C12' },  // 黄色（文字は濃い色）
  Other: { bg: '#9B59B6', text: 'white', shadow: '#8E44AD' }      // 紫（文字は白、影は濃い紫）
};
