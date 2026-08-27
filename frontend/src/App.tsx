import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const MapUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

const getMarkerIcon = (type: string, level: number = 3, isMine: boolean = false) => {
  const icons: Record<string, string> = {
    Traffic: '🚗',
    Crime: '👮',
    Disaster: '🌊',
    Lighting: '🌙',
    Other: '🐾'
  };
  const colors: Record<string, string> = {
    Traffic: '#E74C3C',  // 赤
    Crime: '#3498DB',    // 水色
    Disaster: '#95A5A6', // 灰色
    Lighting: '#F1C40F', // 黄色
    Other: '#9B59B6'     // 紫
  };
  const color = colors[type] || colors.Other;
  const iconEmoji = icons[type] || icons.Other;
  const borderColor = isMine ? '#F1C40F' : '#FFFFFF';

  // Dynamic size based on danger level (1~5):
  // Level 1: 28px, Level 2: 34px, Level 3: 40px, Level 4: 48px, Level 5: 56px
  const sizes = [28, 34, 40, 48, 56];
  const fontSizes = [14, 17, 20, 24, 28];
  const idx = Math.max(0, Math.min(4, (level || 3) - 1));
  const pinSize = sizes[idx];
  const fontSize = fontSizes[idx];
  const pointerSize = Math.max(5, Math.round(pinSize * 0.22));
  const totalHeight = pinSize + pointerSize;

  const isHighDanger = level >= 4;

  return L.divIcon({
    className: 'custom-kid-icon',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0px 4px 8px rgba(0,0,0,0.35)); transform-origin: bottom center; transition: transform 0.2s ease;">
        ${isMine ? '<div style="position: absolute; top: -16px; background: #F1C40F; color: #2C3E50; font-size: 10px; font-weight: 800; padding: 1px 6px; border-radius: 10px; white-space: nowrap; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); z-index: 3;">👑 じぶん</div>' : ''}
        ${isHighDanger ? `<div style="position: absolute; top: ${isMine ? '-30px' : '-16px'}; background: #E74C3C; color: white; font-size: 10px; font-weight: bold; padding: 1px 6px; border-radius: 10px; white-space: nowrap; border: 2px solid white; animation: pin-bounce 0.8s infinite ease-in-out; z-index: 2;">⚠️ Lv.${level}</div>` : ''}
        <div style="background-color: ${color}; width: ${pinSize}px; height: ${pinSize}px; border-radius: 50%; border: 3.5px solid ${borderColor}; display: flex; align-items: center; justify-content: center; font-size: ${fontSize}px; line-height: 1; ${isHighDanger ? 'box-shadow: 0 0 16px ' + color + ';' : ''}">
          ${iconEmoji}
        </div>
        <div style="width: 0; height: 0; border-left: ${pointerSize}px solid transparent; border-right: ${pointerSize}px solid transparent; border-top: ${pointerSize + 2}px solid ${borderColor}; margin-top: -2px;"></div>
      </div>
    `,
    iconSize: [pinSize, totalHeight],
    iconAnchor: [pinSize / 2, totalHeight],
    popupAnchor: [0, -totalHeight + 5]
  });
};

const getHomeIcon = () => {
  return L.divIcon({
    className: 'home-kid-icon',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0px 4px 8px rgba(0,0,0,0.35));">
        <div style="position: absolute; top: -16px; background: #27AE60; color: white; font-size: 10px; font-weight: 800; padding: 1px 6px; border-radius: 10px; white-space: nowrap; border: 2px solid white;">マイホーム</div>
        <div style="background-color: #2C3E50; width: 40px; height: 40px; border-radius: 50%; border: 3.5px solid white; display: flex; align-items: center; justify-content: center; font-size: 22px;">🏠</div>
        <div style="width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 10px solid white; margin-top: -2px;"></div>
      </div>
    `,
    iconSize: [40, 50],
    iconAnchor: [20, 50],
    popupAnchor: [0, -46]
  });
};

const getPickerIcon = () => {
  return L.divIcon({
    className: 'picker-kid-icon',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0px 4px 8px rgba(231, 76, 60, 0.4));">
        <div style="background: #E74C3C; color: white; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 12px; border: 2px solid white; white-space: nowrap; margin-bottom: 2px;">ここ！📍</div>
        <div style="background-color: #E74C3C; width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; font-size: 18px;">🎯</div>
        <div style="width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 9px solid white; margin-top: -2px;"></div>
      </div>
    `,
    iconSize: [50, 60],
    iconAnchor: [25, 60],
    popupAnchor: [0, -55]
  });
};

interface Comment {
  id: number;
  text: string;
  createdAt: string;
}

interface Hazard {
  id: number;
  lat: number;
  lng: number;
  type: string;
  level?: number;
  timeOfDay?: string;
  description: string;
  imageUrl?: string | null;
  comments?: Comment[];
}

function App() {
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [newHazardPos, setNewHazardPos] = useState<L.LatLng | null>(null);
  const [editingHazardId, setEditingHazardId] = useState<number | null>(null);
  const [type, setType] = useState('Traffic');
  const [level, setLevel] = useState<number>(3);
  const [timeOfDay, setTimeOfDay] = useState<string>('all');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.6895, 139.6917]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState<'map' | 'list' | 'form'>('map');
  const [homePos, setHomePos] = useState<[number, number] | null>(() => {
    const saved = localStorage.getItem('homePos');
    return saved ? JSON.parse(saved) : null;
  });
  const [isSettingHome, setIsSettingHome] = useState(false);
  const [myHazardIds, setMyHazardIds] = useState<number[]>(() => {
    const saved = localStorage.getItem('myHazardIds');
    return saved ? JSON.parse(saved) : [];
  });
  const [commentTexts, setCommentTexts] = useState<Record<number, string>>({});
  const [selectedHazardId, setSelectedHazardId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3800);
  };

  const stampTags = [
    '＃くるまがはやすい',
    '＃とびだしちゅうい',
    '＃みちがくらい',
    '＃みずたまり・かわ',
    '＃ふしんしゃ・こえかけ',
    '＃こうじちゅう・だんさ'
  ];

  const handleAddTag = (tag: string) => {
    if (description.includes(tag)) return;
    setDescription(prev => prev ? `${prev} ${tag}` : tag);
  };

  const timeLabels: Record<string, string> = {
    day: '☀️ あさ・ひる',
    evening: '🌆 ゆうがた',
    night: '🌙 よる',
    all: '⏰ いちにちじゅう'
  };

  const filterCategories = [
    { key: 'All', label: 'ぜんぶ 🌈', color: '#2C3E50', text: 'white' },
    { key: 'Traffic', label: 'くるま 🚗', color: '#E74C3C', text: 'white' },
    { key: 'Crime', label: 'ふしんしゃ 👮', color: '#3498DB', text: 'white' },
    { key: 'Disaster', label: 'じしん・かじ 🌊', color: '#95A5A6', text: 'white' },
    { key: 'Lighting', label: 'くらみち 🌙', color: '#F1C40F', text: '#2C3E50' },
    { key: 'Other', label: 'そのほか 🐾', color: '#9B59B6', text: 'white' }
  ];

  const filteredHazards = selectedCategory === 'All' 
    ? hazards 
    : hazards.filter(h => h.type === selectedCategory);

  useEffect(() => {
    if (selectedHazardId && (!isMobile || activeTab === 'list')) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`hazard-${selectedHazardId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedHazardId, activeTab, isMobile]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setActiveTab('map'); // Reset tab on desktop
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // If home is set, use it. Otherwise try geolocation.
    if (homePos) {
      setMapCenter(homePos);
    } else if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos: [number, number] = [position.coords.latitude, position.coords.longitude];
          setMapCenter(pos);
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }

    fetch('http://localhost:3001/api/hazards')
      .then(res => res.json())
      .then(data => setHazards(data));
  }, []);

  const LocationPicker = () => {
    useMapEvents({
      click(e) {
        if (isSettingHome) {
          const pos: [number, number] = [e.latlng.lat, e.latlng.lng];
          if (window.confirm('ここを いつもの ばしょに する？🏠')) {
            setHomePos(pos);
            localStorage.setItem('homePos', JSON.stringify(pos));
            setIsSettingHome(false);
            setMapCenter(pos);
          }
          return;
        }
        if (editingHazardId) return; // Don't pick new location while editing
        setNewHazardPos(e.latlng);
      },
    });
    
    if (isSettingHome) return null;

    return newHazardPos ? (
      <Marker position={newHazardPos} icon={getPickerIcon()}>
        <Popup>ここに きめる！📍</Popup>
      </Marker>
    ) : null;
  };

  const handleStartEdit = (h: Hazard) => {
    setEditingHazardId(h.id);
    setType(h.type);
    setLevel(h.level || 3);
    setTimeOfDay(h.timeOfDay || 'all');
    setDescription(h.description);
    setNewHazardPos(new L.LatLng(h.lat, h.lng));
    setImageFile(null);
    
    if (isMobile) {
      setActiveTab('form');
    }
  };

  const handleCancelEdit = () => {
    setEditingHazardId(null);
    setType('Traffic');
    setLevel(3);
    setTimeOfDay('all');
    setDescription('');
    setNewHazardPos(null);
    setImageFile(null);
    if (isMobile) setActiveTab('map');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHazardPos) {
      if (isMobile) setActiveTab('map');
      showToast('📍 まず ちずの あぶない ばしょを ぽちっと おしてね！', 'error');
      return;
    }

    if (!description.trim()) {
      showToast('✍️ 「どんな かんじ？」に あぶない りゆうを かいてね！', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('type', type);
    formData.append('level', level.toString());
    formData.append('timeOfDay', timeOfDay);
    formData.append('description', description);
    
    if (imageFile) {
      formData.append('image', imageFile);
    }

    if (editingHazardId) {
      // Update existing
      const currentHazard = hazards.find(h => h.id === editingHazardId);
      if (currentHazard && !imageFile && currentHazard.imageUrl) {
        formData.append('imageUrl', currentHazard.imageUrl);
      } else if (!imageFile) {
        formData.append('imageUrl', 'null');
      }

      fetch(`http://localhost:3001/api/hazards/${editingHazardId}`, {
        method: 'PUT',
        body: formData
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed');
          return res.json();
        })
        .then(updatedHazard => {
          setHazards(hazards.map(h => h.id === editingHazardId ? updatedHazard : h));
          handleCancelEdit();
          showToast('✨ ほうこくを なおしたよ！', 'success');
          if (isMobile) setActiveTab('list');
        })
        .catch(() => {
          showToast('💦 うまく おくれなかったよ。もういちど ためしてね！', 'error');
        });
    } else {
      // Create new
      formData.append('lat', newHazardPos.lat.toString());
      formData.append('lng', newHazardPos.lng.toString());
      fetch('http://localhost:3001/api/hazards', {
        method: 'POST',
        body: formData
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed');
          return res.json();
        })
        .then(addedHazard => {
          setHazards([...hazards, addedHazard]);
          const newIds = [...myHazardIds, addedHazard.id];
          setMyHazardIds(newIds);
          localStorage.setItem('myHazardIds', JSON.stringify(newIds));
          setNewHazardPos(null);
          setLevel(3);
          setTimeOfDay('all');
          setDescription('');
          setImageFile(null);
          showToast('🎉 ほうこく できたよ！ ありがとう！', 'success');
          if (isMobile) setActiveTab('list');
        })
        .catch(() => {
          showToast('💦 うまく おくれなかったよ。もういちど ためしてね！', 'error');
        });
    }
  };

  const handleResolve = (id: number) => {
    fetch(`http://localhost:3001/api/hazards/${id}`, {
      method: 'DELETE'
    })
      .then(() => {
        setHazards(hazards.filter(h => h.id !== id));
        if (editingHazardId === id) handleCancelEdit();
      });
  };

  const handlePostComment = (hazardId: number) => {
    const text = commentTexts[hazardId];
    if (!text) return;

    fetch(`http://localhost:3001/api/hazards/${hazardId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })
      .then(res => res.json())
      .then(newComment => {
        setHazards(hazards.map(h => {
          if (h.id === hazardId) {
            return { ...h, comments: [...(h.comments || []), newComment] };
          }
          return h;
        }));
        setCommentTexts({ ...commentTexts, [hazardId]: '' });
      });
  };

  const typeLabels: Record<string, string> = {
    Traffic: 'くるま・こうつう 🚗',
    Crime: 'ふしんしゃ・ぼうはん 👮',
    Disaster: 'じしん・かじ 🌊',
    Lighting: 'くらみち・でんき 🌙',
    Other: 'そのほか 🐾'
  };

  const typeColors: Record<string, { bg: string; text: string; shadow: string }> = {
    Traffic: { bg: '#E74C3C', text: 'white', shadow: '#C0392B' },     // 赤
    Crime: { bg: '#3498DB', text: 'white', shadow: '#2980B9' },       // 水色
    Disaster: { bg: '#95A5A6', text: 'white', shadow: '#7F8C8D' },    // 灰色
    Lighting: { bg: '#F1C40F', text: '#2C3E50', shadow: '#F39C12' },  // 黄色（文字は濃い色）
    Other: { bg: '#9B59B6', text: 'white', shadow: '#8E44AD' }      // 紫（文字は白、影は濃い紫）
  };

  const currentStyle = typeColors[type] || typeColors.Other;

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      fontFamily: '"Open Sans", "Meiryo", "Yu Gothic", sans-serif',
      backgroundColor: '#F0F4F8',
      position: 'relative'
    }}>
      {/* Hiragana Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 3000,
          background: toast.type === 'error' ? '#E74C3C' : '#2ECC71',
          color: 'white',
          padding: '0.8rem 1.6rem',
          borderRadius: '50px',
          fontWeight: 'bold',
          fontSize: isMobile ? '0.85rem' : '1rem',
          boxShadow: '0 8px 25px rgba(0,0,0,0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          whiteSpace: 'nowrap',
          border: '2px solid white'
        }}>
          <span>{toast.message}</span>
        </div>
      )}

      <header style={{ 
        padding: isMobile ? '0.6rem 1rem' : '1rem 2rem', 
        background: '#2C3E50', 
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '1rem' }}>
          <span style={{ fontSize: isMobile ? '1.2rem' : '2rem' }}>🔰</span>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? '1.1rem' : '1.5rem', fontWeight: 'bold' }}>みんなの安全マップ</h1>
            {!isMobile && <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>まちの 安全を みんなで まもろう！</p>}
          </div>
        </div>
        <button 
          onClick={() => {
            if (window.confirm('いつもの ばしょを かえる？🏠')) {
              setIsSettingHome(true);
              if (isMobile) setActiveTab('map');
            }
          }}
          style={{
            background: '#34495E',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            padding: isMobile ? '0.4rem 0.8rem' : '0.5rem 1rem',
            cursor: 'pointer',
            fontSize: isMobile ? '0.7rem' : '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}
        >
          🏠 <span>ばしょ設定</span>
        </button>
      </header>
      
      {/* Category Filter Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: isMobile ? '0.6rem 0.8rem' : '0.75rem 1.5rem',
        background: 'white',
        borderBottom: '1px solid #E2E8F0',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
        zIndex: 900
      }}>
        <span style={{ fontSize: isMobile ? '0.8rem' : '0.85rem', fontWeight: 'bold', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.3rem', marginRight: '0.2rem', flexShrink: 0 }}>
          🔍 <span>しぼりこみ:</span>
        </span>
        {filterCategories.map(cat => {
          const isSelected = selectedCategory === cat.key;
          const count = cat.key === 'All' ? hazards.length : hazards.filter(h => h.type === cat.key).length;
          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              style={{
                background: isSelected ? cat.color : '#F1F5F9',
                color: isSelected ? (cat.text || 'white') : '#475569',
                border: isSelected ? `2px solid ${cat.color}` : '2px solid transparent',
                borderRadius: '20px',
                padding: isMobile ? '0.35rem 0.7rem' : '0.45rem 1rem',
                fontSize: isMobile ? '0.8rem' : '0.9rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                flexShrink: 0,
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? '0 3px 8px rgba(0,0,0,0.18)' : 'none',
                transform: isSelected ? 'scale(1.03)' : 'scale(1)'
              }}
            >
              <span>{cat.label}</span>
              <span style={{
                background: isSelected ? 'rgba(255,255,255,0.3)' : '#E2E8F0',
                color: isSelected ? (cat.text || 'white') : '#64748B',
                borderRadius: '10px',
                padding: '1px 6px',
                fontSize: '0.75rem'
              }}>
                {count}
              </span>
            </button>
          );
        })}
        <div style={{ width: '1px', height: '24px', background: '#CBD5E1', margin: '0 0.2rem', flexShrink: 0 }} />
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          style={{
            background: showHeatmap ? '#E74C3C' : '#94A3B8',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            padding: isMobile ? '0.35rem 0.7rem' : '0.45rem 1rem',
            fontSize: isMobile ? '0.8rem' : '0.9rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            flexShrink: 0,
            transition: 'all 0.2s ease',
            boxShadow: showHeatmap ? '0 3px 8px rgba(231,76,60,0.3)' : 'none'
          }}
        >
          🔥 <span>きけんゾーン: {showHeatmap ? 'ON' : 'OFF'}</span>
        </button>
      </div>
      
      {/* Home Selection Overlay (Welcome) */}
      {!homePos && !isSettingHome && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
          color: 'white'
        }}>
          <div style={{ 
            background: 'white', 
            padding: '2rem', 
            borderRadius: '20px', 
            color: '#2C3E50',
            maxWidth: '400px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            <span style={{ fontSize: '4rem' }}>🏠</span>
            <h2 style={{ margin: '1rem 0' }}>いつもの ばしょを きめよう！</h2>
            <p style={{ lineHeight: '1.6', marginBottom: '2rem' }}>
              じぶんの おうちや、よくいく ばしょを ちずの まんなかに するよ。
            </p>
            <button 
              onClick={() => {
                setIsSettingHome(true);
                if (isMobile) setActiveTab('map');
              }}
              style={{
                background: '#E74C3C',
                color: 'white',
                border: 'none',
                borderRadius: '50px',
                padding: '1rem 2rem',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 0 #C0392B'
              }}
            >
              ちずで えらぶ！
            </button>
          </div>
        </div>
      )}

      {/* Instruction Banner when setting home */}
      {isSettingHome && (
        <div style={{
          position: 'fixed',
          top: isMobile ? '60px' : '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2000,
          background: '#E74C3C',
          color: 'white',
          padding: '1rem 2rem',
          borderRadius: '50px',
          fontWeight: 'bold',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          whiteSpace: 'nowrap'
        }}>
          <span>🏠 ちずを ぽちっと おしてね！</span>
          <button 
            onClick={() => setIsSettingHome(false)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '20px',
              color: 'white',
              padding: '0.3rem 0.8rem',
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            やめる
          </button>
        </div>
      )}
      
      <div style={{ 
        display: 'flex', 
        flex: 1, 
        padding: isMobile ? '0' : '1rem', 
        gap: isMobile ? '0' : '1rem', 
        flexDirection: isMobile ? 'column' : 'row',
        overflow: 'hidden'
      }}>
        {/* Map Section */}
        <div style={{ 
          flex: isMobile ? 'none' : 2, 
          height: isMobile ? '100%' : '100%',
          display: (isMobile && activeTab !== 'map') ? 'none' : 'block',
          borderRadius: isMobile ? '0' : '12px', 
          overflow: 'hidden', 
          boxShadow: isMobile ? 'none' : '0 4px 10px rgba(0,0,0,0.1)',
          border: isMobile ? 'none' : '2px solid #BDC3C7',
          position: 'relative'
        }}>
          <MapContainer center={mapCenter} zoom={15} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <MapUpdater center={mapCenter} />
            {homePos && (
              <Marker position={homePos} icon={getHomeIcon()}>
                <Popup>🏠 いつもの ばしょ</Popup>
              </Marker>
            )}
            {showHeatmap && filteredHazards.map(h => {
              const hLevel = h.level || 3;
              const radius = hLevel * 30;
              const colors: Record<string, string> = {
                Traffic: '#E74C3C',
                Crime: '#3498DB',
                Disaster: '#95A5A6',
                Lighting: '#F1C40F',
                Other: '#9B59B6'
              };
              const circleColor = colors[h.type] || '#9B59B6';
              return (
                <Circle
                  key={`aura-${h.id}`}
                  center={[h.lat, h.lng]}
                  radius={radius}
                  pathOptions={{
                    color: circleColor,
                    fillColor: circleColor,
                    fillOpacity: 0.12 + (hLevel * 0.05),
                    weight: 1.5,
                    dashArray: hLevel >= 4 ? '6, 6' : undefined
                  }}
                />
              );
            })}
            {filteredHazards.map(h => (
              <Marker 
                key={h.id} 
                position={[h.lat, h.lng]} 
                icon={getMarkerIcon(h.type, h.level || 3, myHazardIds.includes(h.id))}
                eventHandlers={{
                  click: () => {
                    setSelectedHazardId(h.id);
                  },
                  popupclose: () => {
                    setSelectedHazardId(null);
                  }
                }}
              >
                <Popup>
                  <div style={{ textAlign: 'center', minWidth: '150px' }}>
                    <strong style={{ fontSize: '1.1rem', color: '#2C3E50' }}>{typeLabels[h.type] || h.type}</strong><br />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', flexWrap: 'wrap', margin: '0.3rem 0' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: (h.level || 3) >= 4 ? '#FDEDEC' : '#F1F5F9',
                        color: (h.level || 3) >= 4 ? '#E74C3C' : '#475569',
                        fontWeight: 'bold',
                        fontSize: '0.75rem'
                      }}>
                        きけん度: Lv.{h.level || 3}
                      </span>
                      {h.timeOfDay && (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          background: '#EDF2F7',
                          color: '#4A5568',
                          fontWeight: 'bold',
                          fontSize: '0.75rem'
                        }}>
                          {timeLabels[h.timeOfDay] || '⏰ いちにちじゅう'}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0.8rem 0', fontSize: '1rem' }}>{h.description}</p>
                    {h.imageUrl && (
                      <img src={h.imageUrl} alt="しゃしん" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', marginBottom: '0.8rem' }} />
                    )}
                    
                    {/* Comments in Popup */}
                    <div style={{ textAlign: 'left', background: '#F8F9FA', padding: '0.5rem', borderRadius: '8px', marginBottom: '0.8rem' }}>
                      <p style={{ fontSize: '0.8rem', fontWeight: 'bold', margin: '0 0 0.4rem 0', color: '#7F8C8D' }}>みんなのコメント</p>
                      {(h.comments?.length || 0) === 0 ? (
                        <p style={{ fontSize: '0.8rem', color: '#BDC3C7', margin: 0 }}>まだありません</p>
                      ) : (
                        <div style={{ maxHeight: '60px', overflowY: 'auto' }}>
                          {h.comments?.map(c => (
                            <div key={c.id} style={{ fontSize: '0.8rem', background: 'white', padding: '2px 6px', borderRadius: '4px', marginBottom: '2px', border: '1px solid #EEE' }}>{c.text}</div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {isMobile && (
                        <button 
                          onClick={() => setActiveTab('list')}
                          style={{ 
                            background: '#F1C40F', 
                            color: '#2C3E50', 
                            border: 'none', 
                            borderRadius: '8px', 
                            cursor: 'pointer', 
                            padding: '0.6rem',
                            fontWeight: 'bold',
                            fontSize: '1rem'
                          }}
                        >
                          いちらんで みる🚩
                        </button>
                      )}
                      
                      {myHazardIds.includes(h.id) ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            onClick={() => handleStartEdit(h)}
                            style={{ 
                              flex: 1,
                              background: '#3498DB', 
                              color: 'white', 
                              border: 'none', 
                              borderRadius: '8px', 
                              cursor: 'pointer', 
                              padding: '0.6rem',
                              fontWeight: 'bold',
                              fontSize: '1rem'
                            }}
                          >
                            なおす📝
                          </button>
                          <button 
                            onClick={() => handleResolve(h.id)}
                            style={{ 
                              flex: 1,
                              background: '#27AE60', 
                              color: 'white', 
                              border: 'none', 
                              borderRadius: '8px', 
                              cursor: 'pointer', 
                              padding: '0.6rem',
                              fontWeight: 'bold',
                              fontSize: '1rem'
                            }}
                          >
                            かんりょう✅
                          </button>
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.8rem', color: '#7F8C8D', margin: 0 }}>※ とうこうした ひとだけが なおせます</p>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
            <LocationPicker />
          </MapContainer>
          
          {isMobile && newHazardPos && activeTab === 'map' && (
            <button 
              onClick={() => setActiveTab('form')}
              style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000,
                background: '#E74C3C',
                color: 'white',
                border: 'none',
                borderRadius: '50px',
                padding: '1rem 2rem',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <span>✍️</span> ここを ほうこくする！
            </button>
          )}
        </div>

        {/* Aside Section (List & Form) */}
        <aside style={{ 
          flex: 1, 
          padding: isMobile ? '1rem' : '1.5rem', 
          background: 'white', 
          borderRadius: isMobile ? '0' : '12px',
          boxShadow: isMobile ? 'none' : '0 4px 10px rgba(0,0,0,0.1)',
          overflowY: 'auto',
          display: isMobile ? (activeTab === 'map' ? 'none' : 'flex') : 'flex',
          flexDirection: 'column',
          gap: isMobile ? '1rem' : '1.5rem',
          paddingBottom: isMobile ? '80px' : '1.5rem' // Nav bar padding
        }}>
          {/* Form Section */}
          <section style={{ display: (!isMobile || activeTab === 'form') ? 'block' : 'none' }}>
            <h2 style={{ color: '#2C3E50', fontSize: isMobile ? '1.2rem' : '1.3rem', borderLeft: `6px solid ${editingHazardId ? '#3498DB' : '#E74C3C'}`, paddingLeft: '0.8rem', marginBottom: '1rem' }}>
              {editingHazardId ? 'ほうこくを なおす' : 'あぶないよ！を おしえる'}
            </h2>
            <div style={{ backgroundColor: editingHazardId ? '#EBF5FB' : '#FFF4F4', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem', border: `1px solid ${editingHazardId ? '#D6EAF8' : '#FFDADA'}` }}>
              <p style={{ fontSize: isMobile ? '0.9rem' : '0.95rem', color: editingHazardId ? '#2980B9' : '#C0392B', margin: 0, fontWeight: 'bold', lineHeight: '1.4' }}>
                {editingHazardId ? 'ないようを かえて、「なおす！」ボタンを おしてね。' : '① ちずで あぶない ばしょを ぽちっと えらんでね。② そのあと、「なにが あぶない？」を えらんでね。'}
              </p>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', fontSize: '1rem' }}>なにが あぶない？</label>
                <select value={type} onChange={e => setType(e.target.value)} style={{ 
                  width: '100%', 
                  padding: '0.8rem', 
                  borderRadius: '8px', 
                  border: '2px solid #BDC3C7',
                  fontSize: '1rem'
                }}>
                  <option value="Traffic">くるまに ちゅうい 🚗</option>
                  <option value="Crime">ぼうはん・ふしんしゃ 👮</option>
                  <option value="Disaster">じしん・かじ 🌊</option>
                  <option value="Lighting">みちが くらい 🌙</option>
                  <option value="Other">そのほか 🐾</option>
                </select>
              </div>

              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', fontSize: '1rem' }}>
                  どれくらい あぶない？（きけん度 1〜5）
                </label>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  {[
                    { lvl: 1, emoji: '🟡', label: '1', color: '#F1C40F', textColor: '#2C3E50' },
                    { lvl: 2, emoji: '🟧', label: '2', color: '#E67E22', textColor: 'white' },
                    { lvl: 3, emoji: '🔴', label: '3', color: '#E74C3C', textColor: 'white' },
                    { lvl: 4, emoji: '🚨', label: '4', color: '#C0392B', textColor: 'white' },
                    { lvl: 5, emoji: '💥', label: '5', color: '#900C3F', textColor: 'white' }
                  ].map(item => {
                    const isLvlSelected = level === item.lvl;
                    return (
                      <button
                        key={item.lvl}
                        type="button"
                        onClick={() => setLevel(item.lvl)}
                        style={{
                          flex: 1,
                          padding: '0.6rem 0.2rem',
                          background: isLvlSelected ? item.color : '#F1F5F9',
                          color: isLvlSelected ? item.textColor : '#475569',
                          border: isLvlSelected ? `2px solid ${item.color}` : '2px solid transparent',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 'bold',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px',
                          transition: 'all 0.15s ease',
                          boxShadow: isLvlSelected ? '0 3px 6px rgba(0,0,0,0.18)' : 'none'
                        }}
                      >
                        <span style={{ fontSize: '1.1rem' }}>{item.emoji}</span>
                        <span>Lv.{item.lvl}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', fontSize: '1rem' }}>
                  いつ頃 あぶない？（じかんたい）
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                  {[
                    { key: 'day', label: '☀️ あさ・ひる' },
                    { key: 'evening', label: '🌆 ゆうがた' },
                    { key: 'night', label: '🌙 よる' },
                    { key: 'all', label: '⏰ いちにちじゅう' }
                  ].map(tOpt => {
                    const isTimeSelected = timeOfDay === tOpt.key;
                    return (
                      <button
                        key={tOpt.key}
                        type="button"
                        onClick={() => setTimeOfDay(tOpt.key)}
                        style={{
                          padding: '0.5rem 0.3rem',
                          background: isTimeSelected ? '#34495E' : '#F1F5F9',
                          color: isTimeSelected ? 'white' : '#475569',
                          border: isTimeSelected ? '2px solid #2C3E50' : '2px solid transparent',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 'bold',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {tOpt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', fontSize: '1rem' }}>
                  {editingHazardId ? 'しゃしん（かえるなら） 📸' : 'しゃしん 📸'}
                </label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={e => setImageFile(e.target.files ? e.target.files[0] : null)} 
                  style={{ width: '100%', fontSize: '1rem' }}
                />
              </div>
              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.4rem', fontSize: '1rem' }}>どんな かんじ？</label>
                
                {/* Quick Stamp Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.5rem' }}>
                  {stampTags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleAddTag(tag)}
                      style={{
                        background: '#E2E8F0',
                        color: '#334155',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  style={{ 
                    width: '100%', 
                    height: isMobile ? '100px' : '80px', 
                    padding: '0.8rem', 
                    borderRadius: '8px', 
                    border: '2px solid #BDC3C7',
                    fontSize: '1rem',
                    resize: 'none'
                  }}
                  placeholder="れい：みちが くらい、くるまが おおい"
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {editingHazardId && (
                  <button type="button" onClick={handleCancelEdit} style={{ 
                    flex: 1, 
                    padding: isMobile ? '0.8rem' : '1rem', 
                    background: '#95A5A6', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '1.2rem',
                    boxShadow: '0 4px 0 #7F8C8D',
                  }}>
                    やめる
                  </button>
                )}
                <button type="submit" style={{ 
                  flex: editingHazardId ? 2 : 1, 
                  padding: isMobile ? '0.8rem' : '1rem', 
                  background: editingHazardId ? '#3498DB' : currentStyle.bg, 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1.2rem',
                  boxShadow: `0 4px 0 ${editingHazardId ? '#2980B9' : currentStyle.shadow}`,
                  transition: 'all 0.2s'
                }}>
                  {editingHazardId ? 'なおす！' : 'ほうこくする！'}
                </button>
              </div>
            </form>
          </section>
          
          <hr style={{ border: 'none', borderTop: '1px solid #EEE', display: (!isMobile || (activeTab === 'form' || activeTab === 'list')) ? 'block' : 'none' }} />
          
          {/* List Section */}
          <section style={{ display: (!isMobile || activeTab === 'list') ? 'block' : 'none' }}>
            <h3 style={{ color: '#2C3E50', fontSize: isMobile ? '1.2rem' : '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>みんなの ほうこく 🚩</span>
              <span style={{ fontSize: '0.85rem', color: '#7F8C8D', fontWeight: 'normal' }}>
                ({filteredHazards.length}件)
              </span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredHazards.length === 0 && (
                <p style={{ color: '#999', textAlign: 'center', padding: '2rem 0' }}>
                  {selectedCategory === 'All' ? 'まだ ほうこくは ありません。' : 'この カテゴリの ほうこくは ありません。'}
                </p>
              )}
              {filteredHazards.map(h => (
                <div 
                  key={h.id} 
                  id={`hazard-${h.id}`}
                  className={selectedHazardId === h.id ? 'highlight-item' : ''}
                  style={{ 
                    padding: '1rem', 
                    background: editingHazardId === h.id ? '#EBF5FB' : '#F8F9FA', 
                    borderRadius: '10px', 
                    border: editingHazardId === h.id ? '2px solid #3498DB' : '1px solid #DEE2E6',
                    position: 'relative',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ 
                        fontSize: '0.8rem', 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '4px', 
                        backgroundColor: '#2C3E50',
                        color: 'white'
                      }}>{typeLabels[h.type]?.split(' ')[0] || h.type}</span>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '10px',
                        backgroundColor: (h.level || 3) >= 4 ? '#FDEDEC' : '#E2E8F0',
                        color: (h.level || 3) >= 4 ? '#E74C3C' : '#475569'
                      }}>
                        Lv.{h.level || 3}
                      </span>
                      {h.timeOfDay && (
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '10px',
                          backgroundColor: '#EDF2F7',
                          color: '#4A5568'
                        }}>
                          {timeLabels[h.timeOfDay] || '⏰ いちにちじゅう'}
                        </span>
                      )}
                    </div>
                    {myHazardIds.includes(h.id) && (
                      <button 
                        onClick={() => handleStartEdit(h)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#3498DB',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: 'bold',
                          padding: '4px 8px'
                        }}
                      >
                        なおす📝
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: '1rem', margin: '0.5rem 0', color: '#333', fontWeight: '500' }}>{h.description}</p>
                  {h.imageUrl && (
                    <img src={h.imageUrl} alt="しゃしん" style={{ width: '100%', maxHeight: isMobile ? '200px' : '150px', objectFit: 'cover', marginTop: '0.5rem', borderRadius: '8px' }} />
                  )}

                  {/* Comment Section in List */}
                  <div style={{ marginTop: '0.8rem', borderTop: '1px dashed #DDD', paddingTop: '0.8rem' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#7F8C8D', marginBottom: '0.5rem' }}>コメント ({h.comments?.length || 0})</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.5rem' }}>
                      {h.comments?.map(c => (
                        <div key={c.id} style={{ fontSize: '0.9rem', background: 'white', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid #EEE', color: '#2C3E50' }}>
                          {c.text}
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <input 
                        type="text" 
                        placeholder="ありがとう！など コメントを かいてね..."
                        value={commentTexts[h.id] || ''}
                        onChange={e => setCommentTexts({...commentTexts, [h.id]: e.target.value})}
                        style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid #BDC3C7', fontSize: '0.9rem' }}
                        onKeyDown={e => e.key === 'Enter' && handlePostComment(h.id)}
                      />
                      <button 
                        onClick={() => handlePostComment(h.id)}
                        disabled={!commentTexts[h.id]}
                        style={{ 
                          padding: '0.5rem 1rem', 
                          background: '#27AE60', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '8px', 
                          cursor: 'pointer', 
                          fontSize: '0.8rem', 
                          fontWeight: 'bold',
                          opacity: commentTexts[h.id] ? 1 : 0.6
                        }}
                      >
                        おく
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '70px',
          background: 'white',
          display: 'flex',
          borderTop: '1px solid #DDD',
          boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
          zIndex: 1000
        }}>
          <button 
            onClick={() => setActiveTab('map')}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: activeTab === 'map' ? '#E74C3C' : '#95A5A6',
              gap: '4px'
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>🗺️</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>ちず</span>
          </button>
          <button 
            onClick={() => setActiveTab('list')}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: activeTab === 'list' ? '#E74C3C' : '#95A5A6',
              gap: '4px'
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>🚩</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>いちらん</span>
          </button>
          <button 
            onClick={() => setActiveTab('form')}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: activeTab === 'form' ? '#E74C3C' : '#95A5A6',
              gap: '4px'
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>✍️</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>ほうこく</span>
          </button>
        </nav>
      )}
    </div>
  );
}

export default App;
