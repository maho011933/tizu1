import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useLocation, AVATAR_OPTIONS } from './context/LocationContext';

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

const getMarkerIcon = (type: string, isMine: boolean = false) => {
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

const getHomeIcon = () => {
  return L.divIcon({
    className: 'home-icon',
    html: `<div style="background-color: #2C3E50; width: 36px; height: 36px; border-radius: 50%; border: 4px solid white; box-shadow: 0 3px 10px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-size: 20px;">🏠</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

const getUserLocationIcon = (avatarId: string = 'boy', heading: number | null = null, isMoving: boolean = false) => {
  const avatarObj = AVATAR_OPTIONS.find(a => a.id === avatarId) || AVATAR_OPTIONS[0];
  const color = avatarObj.color;
  const emoji = avatarObj.emoji;
  const isVehicle = avatarObj.type === 'vehicle' || avatarObj.type === 'pet';
  const movingClass = isMoving ? (isVehicle ? 'is-moving-vehicle' : 'is-moving-walk') : '';

  const headingHtml = heading !== null
    ? `<div class="user-heading-ring" style="transform: rotate(${heading}deg);">
         <div class="user-heading-arrow"></div>
       </div>`
    : '';

  return L.divIcon({
    className: 'user-location-icon',
    html: `
      <div class="user-location-container">
        <div class="user-location-pulse" style="background-color: ${color}55;"></div>
        ${headingHtml}
        <div class="user-location-dot ${movingClass}" style="background: linear-gradient(135deg, ${color}, #2C3E50);">
          ${emoji}
        </div>
        <div style="position: absolute; top: -22px; left: 50%; transform: translateX(-50%); background: ${color}; color: white; font-size: 10px; font-weight: bold; padding: 2px 7px; border-radius: 10px; white-space: nowrap; border: 1.5px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.25); z-index: 3;">
          ${avatarObj.label}
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
};

const MapControls = ({
  userPos,
  onOpenAvatarModal,
  isSimulating,
  onToggleSimulation
}: {
  userPos: [number, number] | null;
  onOpenAvatarModal: () => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
}) => {
  const map = useMap();

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      alignItems: 'flex-end'
    }}>
      {userPos && (
        <button
          onClick={() => map.flyTo(userPos, 16, { animate: true, duration: 1 })}
          title="いまいるばしょへ移動"
          style={{
            backgroundColor: 'white',
            border: '2px solid #3498DB',
            borderRadius: '50px',
            padding: '8px 14px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            color: '#2980B9',
            boxShadow: '0 3px 8px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>📍</span> いまいるばしょ
        </button>
      )}

      <button
        onClick={onOpenAvatarModal}
        title="アバターをかえる"
        style={{
          backgroundColor: 'white',
          border: '2px solid #9B59B6',
          borderRadius: '50px',
          padding: '7px 13px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '0.85rem',
          color: '#8E44AD',
          boxShadow: '0 3px 8px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <span>🎨</span> アイコンをかえる
      </button>

      <button
        onClick={onToggleSimulation}
        title="おさんぽテスト（デモ移動）"
        style={{
          backgroundColor: isSimulating ? '#2ECC71' : 'white',
          border: `2px solid ${isSimulating ? '#27AE60' : '#7F8C8D'}`,
          borderRadius: '50px',
          padding: '6px 12px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '0.8rem',
          color: isSimulating ? 'white' : '#555',
          boxShadow: '0 3px 8px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.2s ease'
        }}
      >
        <span>{isSimulating ? '🐾' : '🚶'}</span> {isSimulating ? 'おさんぽ中 (ていし)' : 'おさんぽテスト'}
      </button>
    </div>
  );
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
  description: string;
  imageUrl?: string | null;
  comments?: Comment[];
}

// 2点間の距離(メートル)を計算 (Haversine formula)
const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Web Audio API による効果音再生
const playAlertSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    gain1.gain.setValueAtTime(0.3, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.15);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1760, ctx.currentTime + 0.18);
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.18);
    osc2.stop(ctx.currentTime + 0.4);
  } catch (e) {
    console.error("Audio play error:", e);
  }
};

// 音声読み上げ（SpeechSynthesis）
const speakAlertText = (text: string) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 1.0;
    utterance.pitch = 1.2;
    window.speechSynthesis.speak(utterance);
  }
};

const categoryNames: Record<string, string> = {
  Traffic: 'こうつう・くるま 🚗',
  Crime: 'ふしんしゃ・ぼうはん 👮',
  Disaster: 'さいがい・すいげん 🌊',
  Lighting: 'くらみち・がいとう 🌙',
  Other: 'そのほか 🐾'
};

function App() {
  const { 
    userPos, 
    accuracy, 
    heading,
    isMoving,
    isTracking, 
    locationHistory, 
    error: locationError, 
    avatar,
    setAvatar,
    isSimulating,
    toggleSimulation,
    startTracking, 
    stopTracking, 
    clearHistory 
  } = useLocation();

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [newHazardPos, setNewHazardPos] = useState<L.LatLng | null>(null);
  const [editingHazardId, setEditingHazardId] = useState<number | null>(null);
  const [type, setType] = useState('Traffic');
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
  const [showHistoryPolyline, setShowHistoryPolyline] = useState<boolean>(true);

  // 通知機能用State
  const [isNotificationEnabled, setIsNotificationEnabled] = useState<boolean>(() => {
    return localStorage.getItem('notificationEnabled') === 'true';
  });
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(() => {
    return localStorage.getItem('audioEnabled') !== 'false';
  });
  const [alertDistance, setAlertDistance] = useState<number>(() => {
    const saved = localStorage.getItem('alertDistance');
    return saved ? parseInt(saved, 10) : 100;
  });
  const [activeAlert, setActiveAlert] = useState<{ hazard: Hazard; distance: number } | null>(null);
  const [notifiedHazardIds, setNotifiedHazardIds] = useState<Record<number, number>>({});
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  // PWA & オフライン対応State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
  });
  const [isIOS] = useState<boolean>(() => {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  });
  const [isIOSInstallModalOpen, setIsIOSInstallModalOpen] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // PWA インストールプロンプト検出 & ネットワーク状態監視
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setIsIOSInstallModalOpen(true);
    } else {
      alert("ブラウザのメニュー（⋮ や共有ボタン）から「ホーム画面に追加」または「アプリをインストール」をえらんでね！📱");
    }
  };
  useEffect(() => {
    if (!userPos || !isNotificationEnabled || hazards.length === 0) return;

    const [userLat, userLng] = userPos;
    const now = Date.now();

    for (const h of hazards) {
      const dist = getDistanceInMeters(userLat, userLng, h.lat, h.lng);

      if (dist <= alertDistance) {
        const lastNotified = notifiedHazardIds[h.id] || 0;
        // 5分(300,000ms)以内に通知していなければ発火
        if (now - lastNotified > 300000) {
          setNotifiedHazardIds(prev => ({ ...prev, [h.id]: now }));
          const roundedDist = Math.round(dist);
          setActiveAlert({ hazard: h, distance: roundedDist });

          // ブラウザ通知
          if ("Notification" in window && Notification.permission === "granted") {
            const catName = categoryNames[h.type] || 'きけん';
            new Notification("⚠️ ちかくに きけんが あるよ！", {
              body: `およそ${roundedDist}mさき: ${h.description} (${catName})`,
              icon: '/favicon.svg'
            });
          }

          // 音声 / 効果音
          if (isAudioEnabled) {
            playAlertSound();
            const catName = categoryNames[h.type] || 'きけん';
            speakAlertText(`きをつけて！ ちかくに ${catName} があるよ`);
          }

          break;
        }
      }
    }
  }, [userPos, hazards, isNotificationEnabled, alertDistance, isAudioEnabled, notifiedHazardIds]);

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      alert("お使いのブラウザは つうち機能に たいおうしていません。");
      return;
    }

    let perm = Notification.permission;
    if (perm === "default") {
      perm = await Notification.requestPermission();
    }

    if (perm === "granted") {
      setIsNotificationEnabled(true);
      localStorage.setItem('notificationEnabled', 'true');
      alert("つうちを オンに したよ！🔔");
    } else {
      alert("つうちの きょかが ありません。ブラウザの設定を かくにんしてね。");
    }
  };

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
      if (!mobile) setActiveTab('map');
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
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

    fetch('/api/hazards')
      .then(res => res.json())
      .then(data => setHazards(data))
      .catch(err => console.error("Error fetching hazards:", err));
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
      <Marker position={newHazardPos} icon={getMarkerIcon('Other')}>
        <Popup>ここにきめる！📍</Popup>
      </Marker>
    ) : null;
  };

  const handleStartEdit = (h: Hazard) => {
    setEditingHazardId(h.id);
    setType(h.type);
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
    setDescription('');
    setNewHazardPos(null);
    setImageFile(null);
    if (isMobile) setActiveTab('map');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHazardPos) {
      if (isMobile) setActiveTab('map');
      return alert('ちずを おして ばしょを えらんでね！');
    }

    const formData = new FormData();
    formData.append('type', type);
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

      fetch(`/api/hazards/${editingHazardId}`, {
        method: 'PUT',
        body: formData
      })
        .then(res => res.json())
        .then(updatedHazard => {
          setHazards(hazards.map(h => h.id === editingHazardId ? updatedHazard : h));
          handleCancelEdit();
          if (isMobile) setActiveTab('list');
        })
        .catch(err => console.error("Error updating hazard:", err));
    } else {
      // Create new
      formData.append('lat', newHazardPos.lat.toString());
      formData.append('lng', newHazardPos.lng.toString());
      fetch('/api/hazards', {
        method: 'POST',
        body: formData
      })
        .then(res => res.json())
        .then(addedHazard => {
          setHazards([...hazards, addedHazard]);
          const newIds = [...myHazardIds, addedHazard.id];
          setMyHazardIds(newIds);
          localStorage.setItem('myHazardIds', JSON.stringify(newIds));
          setNewHazardPos(null);
          setDescription('');
          setImageFile(null);
          if (isMobile) setActiveTab('list');
        })
        .catch(err => console.error("Error adding hazard:", err));
    }
  };

  const handleResolve = (id: number) => {
    fetch(`/api/hazards/${id}`, {
      method: 'DELETE'
    })
      .then(() => {
        setHazards(hazards.filter(h => h.id !== id));
        if (editingHazardId === id) handleCancelEdit();
      })
      .catch(err => console.error("Error deleting hazard:", err));
  };

  const handlePostComment = (hazardId: number) => {
    const text = commentTexts[hazardId];
    if (!text) return;

    fetch(`/api/hazards/${hazardId}/comments`, {
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
      })
      .catch(err => console.error("Error posting comment:", err));
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
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.3rem' : '0.6rem' }}>
          {!isStandalone && (
            <button 
              onClick={handleInstallClick}
              title="スマホのホーム画面にアプリを追加"
              style={{
                background: '#27AE60',
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                padding: isMobile ? '0.4rem 0.7rem' : '0.5rem 1rem',
                cursor: 'pointer',
                fontSize: isMobile ? '0.7rem' : '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            >
              📲 <span>アプリ保存</span>
            </button>
          )}
          <button 
            onClick={() => setIsNotificationModalOpen(true)}
            style={{
              background: isNotificationEnabled ? '#E67E22' : '#7F8C8D',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              padding: isMobile ? '0.4rem 0.8rem' : '0.5rem 1rem',
              cursor: 'pointer',
              fontSize: isMobile ? '0.7rem' : '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            🔔 <span>{isNotificationEnabled ? 'つうち ON' : 'つうち OFF'}</span>
          </button>
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
        </div>
      </header>

      {/* オフライン状態バナー */}
      {!isOnline && (
        <div style={{
          background: '#E67E22',
          color: 'white',
          textAlign: 'center',
          padding: '6px 12px',
          fontSize: '0.85rem',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          zIndex: 1000
        }}>
          <span>📶</span> オフライン動作中（キャッシュされたちずとデータを ひょうじしています）
        </div>
      )}
      
      {/* 近接アラートバナー */}
      {activeAlert && (
        <div className="hazard-alert-banner">
          <div className="hazard-alert-header">
            <div className="hazard-alert-badge">
              ⚠️ 近接アラート ({activeAlert.distance}mさき)
            </div>
            <button 
              className="hazard-alert-close" 
              onClick={() => setActiveAlert(null)}
              title="とじる"
            >
              ✕
            </button>
          </div>
          <div className="hazard-alert-body">
            <div className="hazard-alert-title">
              きをつけて！ ちかくに きけんが あるよ
            </div>
            <div>
              <strong>{categoryNames[activeAlert.hazard.type] || 'きけん'}</strong>: {activeAlert.hazard.description}
            </div>
          </div>
        </div>
      )}

      {/* 通知設定モーダル */}
      {isNotificationModalOpen && (
        <div className="modal-overlay" onClick={() => setIsNotificationModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#2C3E50', fontWeight: 'bold' }}>🔔 つうち・おと の 設定</h3>
              <button 
                onClick={() => setIsNotificationModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#7F8C8D' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* ブラウザ通知トグル */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8F9FA', padding: '12px', borderRadius: '12px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#2C3E50' }}>📱 危険接近の通知</div>
                  <div style={{ fontSize: '0.8rem', color: '#7F8C8D' }}>危険なばしょに 近づいたら つうちするよ</div>
                </div>
                <button
                  onClick={() => {
                    if (!isNotificationEnabled) {
                      requestNotificationPermission();
                    } else {
                      setIsNotificationEnabled(false);
                      localStorage.setItem('notificationEnabled', 'false');
                    }
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    background: isNotificationEnabled ? '#2ECC71' : '#BDC3C7',
                    color: 'white',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {isNotificationEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* 音声/効果音トグル */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8F9FA', padding: '12px', borderRadius: '12px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#2C3E50' }}>🔊 おと・こえ の お知らせ</div>
                  <div style={{ fontSize: '0.8rem', color: '#7F8C8D' }}>音や声で きけんを おしえてくれるよ</div>
                </div>
                <button
                  onClick={() => {
                    const next = !isAudioEnabled;
                    setIsAudioEnabled(next);
                    localStorage.setItem('audioEnabled', String(next));
                    if (next) playAlertSound();
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    background: isAudioEnabled ? '#3498DB' : '#BDC3C7',
                    color: 'white',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {isAudioEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* 通知距離設定 */}
              <div style={{ background: '#F8F9FA', padding: '12px', borderRadius: '12px' }}>
                <div style={{ fontWeight: 'bold', color: '#2C3E50', marginBottom: '8px' }}>📏 どのくらい 近づいたら つうちする？</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[50, 100, 200].map(dist => (
                    <button
                      key={dist}
                      onClick={() => {
                        setAlertDistance(dist);
                        localStorage.setItem('alertDistance', String(dist));
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        borderRadius: '10px',
                        border: alertDistance === dist ? '2px solid #E67E22' : '1px solid #BDC3C7',
                        background: alertDistance === dist ? '#FFEAA7' : 'white',
                        color: alertDistance === dist ? '#D35400' : '#2C3E50',
                        fontWeight: alertDistance === dist ? 'bold' : 'normal',
                        cursor: 'pointer'
                      }}
                    >
                      {dist}m
                    </button>
                  ))}
                </div>
              </div>

              {/* 位置情報トラッキング設定 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8F9FA', padding: '12px', borderRadius: '12px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#2C3E50' }}>📍 位置情報のトラッキング</div>
                  <div style={{ fontSize: '0.8rem', color: '#7F8C8D' }}>
                    {isTracking ? `追跡中 (精度: およそ${accuracy ? Math.round(accuracy) : '?'}m)` : '停止中'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (isTracking) {
                      stopTracking();
                    } else {
                      startTracking();
                    }
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    background: isTracking ? '#2ECC71' : '#E74C3C',
                    color: 'white',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {isTracking ? '追跡 ON' : '追跡 OFF'}
                </button>
              </div>

              {/* 移動ルート（軌跡）の表示切り替え・履歴クリア */}
              <div style={{ background: '#F8F9FA', padding: '12px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 'bold', color: '#2C3E50' }}>🗺️ あるいた ルートの表示</div>
                  <button
                    onClick={() => setShowHistoryPolyline(!showHistoryPolyline)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      border: '1px solid #BDC3C7',
                      background: showHistoryPolyline ? '#EBF5FB' : 'white',
                      color: showHistoryPolyline ? '#2980B9' : '#7F8C8D',
                      fontWeight: 'bold',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    {showHistoryPolyline ? '表示中' : '非表示'}
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: '#7F8C8D' }}>
                  <span>きろく件数: {locationHistory.length} 件</span>
                  {locationHistory.length > 0 && (
                    <button
                      onClick={clearHistory}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#E74C3C',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        fontSize: '0.8rem'
                      }}
                    >
                      リセットする
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsNotificationModalOpen(false)}
              style={{
                marginTop: '20px',
                width: '100%',
                padding: '12px',
                background: '#3498DB',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              OK (とじる)
            </button>
          </div>
        </div>
      )}
      
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
            キャンセル
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
            {showHistoryPolyline && locationHistory.length > 1 && (
              <Polyline 
                positions={locationHistory.map(p => [p.lat, p.lng] as [number, number])} 
                pathOptions={{ color: '#2980B9', weight: 4, opacity: 0.7, dashArray: '6, 8' }} 
              />
            )}
            {userPos && (
              <Marker position={userPos} icon={getUserLocationIcon(avatar, heading, isMoving)}>
                <Popup>
                  <div style={{ textAlign: 'center' }}>
                    <strong>{AVATAR_OPTIONS.find(a => a.id === avatar)?.emoji} いまいるばしょ ({AVATAR_OPTIONS.find(a => a.id === avatar)?.label})</strong><br/>
                    <span style={{ fontSize: '0.8rem', color: '#7F8C8D' }}>
                      測位精度: 約{accuracy ? Math.round(accuracy) : '?'}m
                      {isMoving && ' 🏃 うごき中'}
                    </span>
                  </div>
                </Popup>
              </Marker>
            )}
          {locationError && !isSimulating && (
            <div style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              zIndex: 1000,
              background: '#FFF3CD',
              border: '2px solid #FFEBAA',
              color: '#856404',
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>⚠️</span> {locationError}
            </div>
          )}
          <MapControls
            userPos={userPos}
            onOpenAvatarModal={() => setIsAvatarModalOpen(true)}
            isSimulating={isSimulating}
            onToggleSimulation={toggleSimulation}
          />
            {homePos && (
              <Marker position={homePos} icon={getHomeIcon()}>
                <Popup>🏠 いつもの ばしょ</Popup>
              </Marker>
            )}
            {hazards.map(h => (
              <Marker 
                key={h.id} 
                position={[h.lat, h.lng]} 
                icon={getMarkerIcon(h.type, myHazardIds.includes(h.id))}
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
                    <p style={{ margin: '0.8rem 0', fontSize: '1rem' }}>{h.description}</p>
                    {h.imageUrl && (
                      <img src={h.imageUrl} alt="Hazard" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', marginBottom: '0.8rem' }} />
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
                            完了✅
                          </button>
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.8rem', color: '#7F8C8D', margin: 0 }}>※ 投稿した人だけが なおせます</p>
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
              {editingHazardId ? 'ほうこくを なおす' : 'あぶないよ！をおしえる'}
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
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', fontSize: '1rem' }}>しゃしん（かえるなら） 📸</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={e => setImageFile(e.target.files ? e.target.files[0] : null)} 
                  style={{ width: '100%', fontSize: '1rem' }}
                />
              </div>
              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', fontSize: '1rem' }}>どんな かんじ？</label>
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
            <h3 style={{ color: '#2C3E50', fontSize: isMobile ? '1.2rem' : '1.2rem', marginBottom: '1rem' }}>みんなの ほうこく 🚩</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {hazards.length === 0 && <p style={{ color: '#999' }}>まだ ほうこくは ありません。</p>}
              {hazards.map(h => (
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
                    <span style={{ 
                      fontSize: '0.8rem', 
                      padding: '0.2rem 0.5rem', 
                      borderRadius: '4px', 
                      backgroundColor: '#2C3E50',
                      color: 'white'
                    }}>{typeLabels[h.type]?.split(' ')[0] || h.type}</span>
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
                    <img src={h.imageUrl} alt="Hazard" style={{ width: '100%', maxHeight: isMobile ? '200px' : '150px', objectFit: 'cover', marginTop: '0.5rem', borderRadius: '8px' }} />
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
                        placeholder="ありがとう！など..."
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

      {/* アバター選択モーダル */}
      {isAvatarModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAvatarModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ border: '4px solid #9B59B6', maxWidth: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#8E44AD', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem' }}>
                <span>🎨</span> アイコンを えらぼう！
              </h3>
              <button 
                onClick={() => setIsAvatarModalOpen(false)}
                style={{ background: '#F0F0F0', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', color: '#666' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: '#555', margin: '0 0 16px 0', lineHeight: 1.4 }}>
              ちずのうえで うごく あなたの アイコンを えらんでね！
            </p>

            <div className="avatar-grid">
              {AVATAR_OPTIONS.map(opt => (
                <div
                  key={opt.id}
                  className={`avatar-card ${avatar === opt.id ? 'selected' : ''}`}
                  onClick={() => {
                    setAvatar(opt.id);
                    setIsAvatarModalOpen(false);
                  }}
                >
                  <div className="avatar-emoji-large">{opt.emoji}</div>
                  <div className="avatar-label-text">{opt.label}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #EEE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#7F8C8D' }}>
                いまのアイコン: <strong>{AVATAR_OPTIONS.find(a => a.id === avatar)?.label}</strong>
              </span>
              <button
                onClick={() => {
                  toggleSimulation();
                  setIsAvatarModalOpen(false);
                }}
                style={{
                  background: isSimulating ? '#E74C3C' : '#2ECC71',
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                }}
              >
                {isSimulating ? '⏹ おさんぽテストをとめる' : '🐾 おさんぽテスト（デモ移動）'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Safari向けインストール案内モーダル */}
      {isIOSInstallModalOpen && (
        <div className="modal-overlay" onClick={() => setIsIOSInstallModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ border: '4px solid #3498DB', textAlign: 'center', maxWidth: '400px' }}>
            <span style={{ fontSize: '3rem' }}>📲</span>
            <h3 style={{ margin: '10px 0', color: '#2C3E50' }}>ホーム画面に アプリを追加しよう！</h3>
            <div style={{ textAlign: 'left', background: '#F8F9FA', padding: '14px', borderRadius: '12px', fontSize: '0.9rem', lineHeight: '1.6', margin: '16px 0' }}>
              <p style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#3498DB', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>1</span>
                <span>Safari下の <strong>共有ボタン</strong> <span style={{ fontSize: '1.2rem' }}>⎋</span> を押す</span>
              </p>
              <p style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#3498DB', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>2</span>
                <span>メニューから <strong>「ホーム画面に追加 ➕」</strong> を選ぶ</span>
              </p>
              <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#3498DB', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>3</span>
                <span>右上の <strong>「追加」</strong> を押すとホーム画面に保存されるよ！</span>
              </p>
            </div>
            <button
              onClick={() => setIsIOSInstallModalOpen(false)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#3498DB',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 'bold',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              わかった！👍
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
