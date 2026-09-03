
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, Polyline } from 'react-leaflet';


import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, Polyline, Circle } from 'react-leaflet';


import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from 'react-leaflet';



import 'leaflet/dist/leaflet.css';
import './App.css';
import L from 'leaflet';
import { useLocation, AVATAR_OPTIONS } from './context/LocationContext';

// Fix for default marker icons in React Leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
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


const getMarkerIcon = (type: string, isMine: boolean = false, level: number = 2) => {

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
    Shelter: '#2ECC71',  // 緑
    AED: '#E67E22',      // オレンジ
    Other: '#9B59B6'     // 紫
  };
  const emojis: Record<string, string> = {
    Traffic: '🚗',
    Crime: '👮',
    Disaster: '🌊',
    Lighting: '🌙',
    Other: '🐾'
  };

  const color = colors[type] || colors.Other;

  const emoji = emojis[type] || emojis.Other;
  const borderColor = isMine ? '#F1C40F' : 'white';

  const size = 22 + (level * 6);
  const fontSize = 10 + (level * 4);
  const animationClass = level >= 5 ? 'alert-marker' : (level === 4 ? 'pulse-marker' : '');

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

      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        <div class="${animationClass}" style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 3px solid ${borderColor}; box-shadow: 0 3px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: ${fontSize}px;">${emoji}</div>
        ${isMine ? '<div style="position: absolute; top: -18px; left: 50%; transform: translateX(-50%); background: #F1C40F; color: #2C3E50; font-size: 10px; font-weight: bold; padding: 1px 4px; border-radius: 4px; white-space: nowrap; border: 1px solid white;"><ruby>自分<rt>じぶん</rt></ruby>の <ruby>報告<rt>ほうこく</rt></ruby></div>' : ''}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],

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



interface Hazard {
  id: number;
  lat: number;
  lng: number;
  type: string;
  level?: number;
  description: string;
  imageUrl?: string | null;
  comments?: Comment[];
  
    inport { getMarkerIcon, getHomeIcon, typeLabels, typeColors } from "./utils/icons";
    import type { Hazard } from "./types";
  
interface LocationPickerProps {
  isSettingHome: boolean;
  editingHazardId: number | null;
  newHazardPos: L.LatLng | null;
  setHomePos: (pos: [number, number]) => void;
  setMapCenter: (pos: [number, number]) => void;
  setIsSettingHome: (val: boolean) => void;
  setNewHazardPos: (pos: L.LatLng | null) => void;

}

interface NearestResult {
  hazard: Hazard;
  distanceMeters: number;
  walkTimeMinutes: number;
  origin: [number, number];
  categoryName: string;
}
const LocationPicker = ({
  isSettingHome,
  editingHazardId,
  newHazardPos,
  setHomePos,
  setMapCenter,
  setIsSettingHome,
  setNewHazardPos
}: LocationPickerProps) => {
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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
  const [level, setLevel] = useState<number>(3);
  const [timeOfDay, setTimeOfDay] = useState<string>('all');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([38.3560, 140.3700]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState<'map' | 'list' | 'form'>('map');
  const [homePos, setHomePos] = useState<[number, number] | null>(() => {
    const saved = localStorage.getItem('homePos');
    return saved ? JSON.parse(saved) : null;
  });
  const [mapCenter, setMapCenter] = useState<[number, number]>(() => homePos || [35.6895, 139.6917]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState<'map' | 'list' | 'form'>('map');
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

  const [nearestResult, setNearestResult] = useState<NearestResult | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');

  const filteredHazards = useMemo(() => {
    if (activeCategoryFilter === 'ALL') {
      return hazards;
    }
    return hazards.filter(h => h.type === activeCategoryFilter);
  }, [hazards, activeCategoryFilter]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: hazards.length };
    hazards.forEach(h => {
      counts[h.type] = (counts[h.type] || 0) + 1;
    });
    return counts;
  }, [hazards]);

  const findNearest = async (targetType: 'Shelter' | 'AED') => {
    const origin = homePos || mapCenter;
    try {
      const res = await fetch(`http://localhost:3001/api/hazards/nearby?lat=${origin[0]}&lng=${origin[1]}&type=${targetType}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        setNearestResult({
          hazard: item,
          distanceMeters: item.distanceMeters,
          walkTimeMinutes: item.walkTimeMinutes,
          origin: origin,
          categoryName: targetType === 'Shelter' ? 'ひなんじょ' : 'AED'
        });
        setMapCenter([item.lat, item.lng]);
        setSelectedHazardId(item.id);
        if (isMobile) setActiveTab('map');
      } else {
        alert(`${targetType === 'Shelter' ? 'ひなんじょ' : 'AED'}が みつかりませんでした`);
      }
    } catch (e) {
      console.error('Error finding nearest spot:', e);
    }
  };
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

  // AI Area Summary Modal State
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [areaSummary, setAreaSummary] = useState<AreaSummary | null>(null);

  // AI Safety Chat Modal State
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: 'bot',
      text: 'こんにちは！ ぼくは あんぜん博士だよ。まちの あんぜんや きけんについて なんでも きいてね！ 🎒'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);

  // Feedback states
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackRole, setFeedbackRole] = useState<'child' | 'parent'>('child');
  const [childEase, setChildEase] = useState<'easy' | 'normal' | 'hard' | ''>('');
  const [childReadability, setChildReadability] = useState<'readable' | 'some_hard' | 'unreadable' | ''>('');
  const [childLiked, setChildLiked] = useState('');
  const [childNeedsFix, setChildNeedsFix] = useState('');
  const [parentRating, setParentRating] = useState<number>(5);
  const [parentChildAge, setParentChildAge] = useState('');
  const [parentUsability, setParentUsability] = useState('とても使いやすい');
  const [parentComment, setParentComment] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);


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

    if (!homePos && "geolocation" in navigator) {

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

    fetch(`${API_BASE_URL}/api/hazards`)
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

      <Marker position={newHazardPos} icon={getMarkerIcon('Other')}>
        <Popup>ここに <ruby>決<rt>き</rt></ruby>める！📍</Popup>

      <Marker position={newHazardPos} icon={getPickerIcon()}>
        <Popup>ここに きめる！📍</Popup>
        
      </Marker>
    ) : null;
  };

  }, [homePos]);

  const handleStartEdit = (h: Hazard) => {
    setEditingHazardId(h.id);
    setType(h.type);
    setLevel(h.level || 3);
    setTimeOfDay(h.timeOfDay || 'all');
    setDescription(h.description);
    setNewHazardPos(new L.LatLng(h.lat, h.lng));
    setImageFile(null);
    setAiAssistPreview(null);
    
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
    setAiAssistPreview(null);
    if (isMobile) setActiveTab('map');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHazardPos) {
      if (isMobile) setActiveTab('map');

      return alert('地図を ぽちっと 押して 場所を 選んでね！📍');

      showToast('📍 まず ちずの あぶない ばしょを ぽちっと おしてね！', 'error');
      return;
    }

    if (!description.trim()) {
      showToast('✍️ 「どんな かんじ？」に あぶない りゆうを かいてね！', 'error');
      return;

    }

    const formData = new FormData();
    formData.append('lat', newHazardPos.lat.toString());
    formData.append('lng', newHazardPos.lng.toString());
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


      fetch(`/api/hazards/${editingHazardId}`, {

      fetch(`${API_BASE_URL}/api/hazards/${editingHazardId}`, {

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

        .catch(err => console.error("Error updating hazard:", err));

        .catch(() => {
          showToast('💦 うまく おくれなかったよ。もういちど ためしてね！', 'error');
        });

    } else {
      // Create new
      formData.append('lat', newHazardPos.lat.toString());
      formData.append('lng', newHazardPos.lng.toString());

      fetch('/api/hazards', {

      fetch(`${API_BASE_URL}/api/hazards`, {

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
          setNewHazardPos(null);
          setImageFile(null);
          showToast('🎉 ほうこく できたよ！ ありがとう！', 'success');
          if (isMobile) setActiveTab('list');
        })

        .catch(err => console.error("Error adding hazard:", err));

        .catch(() => {
          showToast('💦 うまく おくれなかったよ。もういちど ためしてね！', 'error');
        });

    }
  };

  const handleResolve = (id: number) => {

    fetch(`/api/hazards/${id}`, {

    fetch(`${API_BASE_URL}/api/hazards/${id}`, {

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

    fetch(`${API_BASE_URL}/api/hazards/${hazardId}/comments`, {

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
    Shelter: 'ひなんじょ 🏫',
    AED: 'AED・きゅうきゅう 🫀',
    Other: 'そのほか 🐾'

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingFeedback(true);

    const feedbackPayload = feedbackRole === 'child' ? {
      role: 'child',
      ease: childEase,
      readability: childReadability,
      liked: childLiked,
      needsFix: childNeedsFix
    } : {
      role: 'parent',
      rating: parentRating,
      childAge: parentChildAge,
      usability: parentUsability,
      comment: parentComment
    };

    try {
      await fetch('http://localhost:3001/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackPayload)
      });
      setFeedbackSubmitted(true);
      setTimeout(() => {
        setFeedbackSubmitted(false);
        setIsFeedbackOpen(false);
        // Reset form
        setChildEase('');
        setChildReadability('');
        setChildLiked('');
        setChildNeedsFix('');
        setParentRating(5);
        setParentComment('');
      }, 1500);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      alert('ごめんね、おくれませんでした。もういちど ためしてね。');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const typeLabels: Record<string, React.ReactNode> = {
    Traffic: <><ruby>車<rt>くるま</rt></ruby>・<ruby>交通<rt>こうつう</rt></ruby> 🚗</>,
    Crime: <><ruby>不審者<rt>ふしんしゃ</rt></ruby>・<ruby>防犯<rt>ぼうはん</rt></ruby> 👮</>,
    Disaster: <><ruby>地震<rt>じしん</rt></ruby>・<ruby>火災<rt>かさい</rt></ruby> 🌊</>,
    Lighting: <><ruby>道<rt>みち</rt></ruby>が <ruby>暗<rt>くら</rt></ruby>い・<ruby>電気<rt>でんき</rt></ruby> 🌙</>,
    Other: <>その他 🐾</>
  };

  const typeShortLabels: Record<string, string> = {
    Traffic: '車・交通',
    Crime: '不審者・防犯',
    Disaster: '地震・火災',
    Lighting: '暗い道',
    Other: 'その他'
  };

  const typeColors: Record<string, { bg: string; text: string; shadow: string }> = {
    Traffic: { bg: '#E74C3C', text: 'white', shadow: '#C0392B' },     // 赤
    Crime: { bg: '#3498DB', text: 'white', shadow: '#2980B9' },       // 水色
    Disaster: { bg: '#95A5A6', text: 'white', shadow: '#7F8C8D' },    // 灰色
    Lighting: { bg: '#F1C40F', text: '#2C3E50', shadow: '#F39C12' },  // 黄色（文字は濃い色）
    Shelter: { bg: '#2ECC71', text: 'white', shadow: '#27AE60' },     // 緑
    AED: { bg: '#E67E22', text: 'white', shadow: '#D35400' },         // オレンジ
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
        padding: isMobile ? '0.6rem 1rem' : '0.8rem 1.5rem', 
        background: '#2C3E50', 
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '1rem' }}>
          <span style={{ fontSize: isMobile ? '1.3rem' : '2rem' }}>🔰</span>
          <div>

            <h1 style={{ margin: 0, fontSize: isMobile ? '1.1rem' : '1.5rem', fontWeight: 'bold' }}>みんなの<ruby>安全<rt>あんぜん</rt></ruby>マップ</h1>
            {!isMobile && <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}><ruby>街<rt>まち</rt></ruby>の <ruby>安全<rt>あんぜん</rt></ruby>を みんなで <ruby>守<rt>まも</rt></ruby>ろう！</p>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.4rem' : '0.8rem' }}>
          <button 
            onClick={() => setIsFeedbackOpen(true)}
            style={{
              background: '#E67E22',

            <h1 style={{ margin: 0, fontSize: isMobile ? '1.1rem' : '1.4rem', fontWeight: 'bold' }}>みんなの安全マップ</h1>
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

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button 
            onClick={() => {
              setMapCenter([38.3560, 140.3700]);
              if (isMobile) setActiveTab('map');
            }}
            style={{
              background: '#27AE60',

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

              fontWeight: 'bold'
            }}
          >
            🗺️ <span>天童市ピンへ</span>
          </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Area Summary Button */}
          <button
            onClick={handleOpenAreaSummary}
            style={{
              background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
                
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              padding: isMobile ? '0.4rem 0.7rem' : '0.5rem 1rem',
              cursor: 'pointer',
              fontSize: isMobile ? '0.75rem' : '0.9rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',

              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            💌 <span><ruby>感想<rt>かんそう</rt></ruby></span>
          </button>

              boxShadow: '0 2px 8px rgba(255,107,107,0.4)'
            }}
          >
            ✨ <span>地域のまとめ</span>
          </button>

          {/* Set Home Button */}


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


              padding: isMobile ? '0.4rem 0.8rem' : '0.5rem 1rem',
              cursor: 'pointer',
              fontSize: isMobile ? '0.7rem' : '0.9rem',

              padding: isMobile ? '0.4rem 0.7rem' : '0.5rem 1rem',
              cursor: 'pointer',
              fontSize: isMobile ? '0.75rem' : '0.9rem',


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

      
      {/* Quick Nearest Safety Navigation Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: isMobile ? 'space-around' : 'center',
        gap: isMobile ? '0.4rem' : '1rem',
        padding: isMobile ? '0.5rem 0.8rem' : '0.6rem 1.5rem',
        background: '#FFFFFF',
        borderBottom: '2px solid #E2E8F0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        zIndex: 900,
        flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: isMobile ? '0.75rem' : '0.9rem', fontWeight: 'bold', color: '#34495E' }}>
          🏃‍♂️ いちばん ちかい 安全スポット:
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => findNearest('Shelter')}
            style={{
              background: '#2ECC71',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              padding: isMobile ? '0.35rem 0.8rem' : '0.45rem 1.2rem',
              fontWeight: 'bold',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              boxShadow: '0 3px 0 #27AE60'
            }}
          >
            🏫 ちかい ひなんじょ
          </button>
          <button
            onClick={() => findNearest('AED')}
            style={{
              background: '#E67E22',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              padding: isMobile ? '0.35rem 0.8rem' : '0.45rem 1.2rem',
              fontWeight: 'bold',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              boxShadow: '0 3px 0 #D35400'
            }}
          >
            🫀 ちかい AED
          </button>
        </div>
      </div>


            🏠 <span><ruby>場所<rt>ばしょ</rt></ruby>を かえる</span>
          </button>
        </div>
      </header>

            🏠 <span>ばしょ設定</span>
          </button>
        </div>
      </header>
      

      {/* Category Filter Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: isMobile ? '0.4rem 0.6rem' : '0.5rem 1.5rem',
        background: '#F8FAFC',
        borderBottom: '1px solid #CBD5E1',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
        zIndex: 850
      }}>
        <span style={{ fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: 'bold', color: '#64748B', flexShrink: 0, marginRight: '0.2rem' }}>
          🔍 しぼりこみ:
        </span>
        <button
          onClick={() => setActiveCategoryFilter('ALL')}
          style={{
            background: activeCategoryFilter === 'ALL' ? '#2C3E50' : '#FFFFFF',
            color: activeCategoryFilter === 'ALL' ? '#FFFFFF' : '#475569',
            border: activeCategoryFilter === 'ALL' ? '2px solid #2C3E50' : '1px solid #CBD5E1',
            borderRadius: '20px',
            padding: isMobile ? '0.25rem 0.6rem' : '0.35rem 0.8rem',
            fontSize: isMobile ? '0.75rem' : '0.85rem',

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
            gap: '0.3rem',
            boxShadow: activeCategoryFilter === 'ALL' ? '0 2px 6px rgba(44,62,80,0.3)' : 'none',
            transform: activeCategoryFilter === 'ALL' ? 'scale(1.04)' : 'scale(1)',
            transition: 'all 0.15s ease-in-out',
            flexShrink: 0
          }}
        >
          🌈 ぜんぶ <span style={{ background: activeCategoryFilter === 'ALL' ? '#34495E' : '#E2E8F0', color: activeCategoryFilter === 'ALL' ? '#FFF' : '#64748B', borderRadius: '10px', padding: '1px 6px', fontSize: '0.7rem' }}>{categoryCounts.ALL || 0}</span>
        </button>
        {Object.entries(typeLabels).map(([catKey, label]) => {
          const isActive = activeCategoryFilter === catKey;
          const colorInfo = typeColors[catKey] || { bg: '#9B59B6', text: 'white', shadow: '#8E44AD' };
          const count = categoryCounts[catKey] || 0;
          return (
            <button
              key={catKey}
              onClick={() => setActiveCategoryFilter(isActive ? 'ALL' : catKey)}
              style={{
                background: isActive ? colorInfo.bg : '#FFFFFF',
                color: isActive ? colorInfo.text : '#334155',
                border: isActive ? `2px solid ${colorInfo.shadow}` : '1px solid #CBD5E1',
                borderRadius: '20px',
                padding: isMobile ? '0.25rem 0.6rem' : '0.35rem 0.8rem',
                fontSize: isMobile ? '0.75rem' : '0.85rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                boxShadow: isActive ? `0 3px 8px ${colorInfo.shadow}55` : 'none',
                transform: isActive ? 'scale(1.04)' : 'scale(1)',
                transition: 'all 0.15s ease-in-out',
                flexShrink: 0
              }}
            >
              {label} <span style={{ background: isActive ? 'rgba(0,0,0,0.2)' : '#E2E8F0', color: isActive ? '#FFF' : '#64748B', borderRadius: '10px', padding: '1px 6px', fontSize: '0.7rem' }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Nearest Result Floating Notification Banner */}
      {nearestResult && (
        <div style={{
          position: 'fixed',
          top: isMobile ? '115px' : '125px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1500,
          background: nearestResult.categoryName === 'ひなんじょ' ? '#2ECC71' : '#E67E22',
          color: 'white',
          padding: isMobile ? '0.6rem 1rem' : '0.8rem 1.4rem',
          borderRadius: '30px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.8rem',
          maxWidth: '92%',
          fontSize: isMobile ? '0.8rem' : '0.95rem',
          fontWeight: 'bold',
          animation: 'fadeIn 0.3s ease-in-out'
        }}>
          <span>
            {nearestResult.categoryName === 'ひなんじょ' ? '🏫' : '🫀'} いちばん ちかい {nearestResult.categoryName}: 
            <span style={{ textDecoration: 'underline', margin: '0 4px', fontWeight: '900' }}>
              {nearestResult.hazard.description.split('\n')[0].replace(/【.*?】/, '')}
            </span>
            （約{nearestResult.distanceMeters}m / あるいて 約{nearestResult.walkTimeMinutes}分）
          </span>
          <button
            onClick={() => setNearestResult(null)}
            style={{
              background: 'rgba(0,0,0,0.2)',
              border: 'none',
              borderRadius: '50%',
              color: 'white',
              width: '22px',
              height: '22px',
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
            title="とじる"
          >
            ✕
          </button>
        </div>
      )}
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
            <h2 style={{ margin: '1rem 0' }}>いつもの <ruby>場所<rt>ばしょ</rt></ruby>を <ruby>決<rt>き</rt></ruby>めよう！</h2>
            <p style={{ lineHeight: '1.6', marginBottom: '2rem' }}>
              <ruby>自分<rt>じぶん</rt></ruby>の おうちや、よく<ruby>行<rt>い</rt></ruby>く <ruby>場所<rt>ばしょ</rt></ruby>を <ruby>地図<rt>ちず</rt></ruby>の <ruby>真<rt>ま</rt></ruby>ん<ruby>中<rt>なか</rt></ruby>に するよ。
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'center' }}>
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
                  padding: '0.9rem 2rem',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 0 #C0392B',
                  width: '100%'
                }}
              >
                ちずで えらぶ！📍
              </button>
              <button 
                onClick={() => {
                  setHomePos([38.3560, 140.3700]);
                  setMapCenter([38.3560, 140.3700]);
                  localStorage.setItem('homePos', JSON.stringify([38.3560, 140.3700]));
                }}
                style={{
                  background: '#ECF0F1',
                  color: '#7F8C8D',
                  border: 'none',
                  borderRadius: '50px',
                  padding: '0.6rem 1.5rem',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                まずは ちずを みる（天童市）🗺️
              </button>
            </div>
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
              <ruby>地図<rt>ちず</rt></ruby>で えらぶ！📍
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
          <span>🏠 <ruby>地図<rt>ちず</rt></ruby>を ぽちっと おしてね！</span>
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

            {nearestResult && (
              <>
                <Polyline
                  positions={[nearestResult.origin, [nearestResult.hazard.lat, nearestResult.hazard.lng]]}
                  pathOptions={{
                    color: nearestResult.categoryName === 'ひなんじょ' ? '#2ECC71' : '#E67E22',
                    dashArray: '8, 8',
                    weight: 4,
                    opacity: 0.8
                  }}
                />
                <Circle
                  center={[nearestResult.hazard.lat, nearestResult.hazard.lng]}
                  radius={40}
                  pathOptions={{
                    color: nearestResult.categoryName === 'ひなんじょ' ? '#2ECC71' : '#E67E22',
                    fillColor: nearestResult.categoryName === 'ひなんじょ' ? '#2ECC71' : '#E67E22',
                    fillOpacity: 0.35,
                    weight: 2
                  }}
                />
              </>
            )}

            {homePos && (
              <Marker position={homePos} icon={getHomeIcon()}>
                <Popup>🏠 いつもの <ruby>場所<rt>ばしょ</rt></ruby></Popup>
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

                icon={getMarkerIcon(h.type, myHazardIds.includes(h.id), h.level || 2)}

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

                    {/* AI Safety Advice in Popup */}
                    {h.aiAdvice && (
                      <div style={{ textAlign: 'left', background: '#EEF9FF', padding: '0.6rem', borderRadius: '8px', marginBottom: '0.8rem', border: '1px solid #BEE3F8' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#2B6CB0', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <span>🤖</span> あんぜん博士のアドバイス
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#2C5282', lineHeight: '1.4', background: 'white', padding: '0.4rem', borderRadius: '6px' }}>
                          {h.aiAdvice.forKids}
                        </div>
                      </div>
                    )}
                    
                    {/* Comments in Popup */}
                    <div style={{ textAlign: 'left', background: '#F8F9FA', padding: '0.5rem', borderRadius: '8px', marginBottom: '0.8rem' }}>
                      <p style={{ fontSize: '0.8rem', fontWeight: 'bold', margin: '0 0 0.4rem 0', color: '#7F8C8D' }}>みんなの コメント</p>
                      {(h.comments?.length || 0) === 0 ? (
                        <p style={{ fontSize: '0.8rem', color: '#BDC3C7', margin: 0 }}>まだ ありません</p>
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
                          <ruby>一覧<rt>いちらん</rt></ruby>で <ruby>見<rt>み</rt></ruby>る🚩
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
                            <ruby>直<rt>なお</rt></ruby>す📝
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

                            <ruby>完了<rt>かんりょう</rt></ruby>✅
                          </button>
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.8rem', color: '#7F8C8D', margin: 0 }}>※ <ruby>報告<rt>ほうこく</rt></ruby>した <ruby>人<rt>ひと</rt></ruby>だけが 直<rt>なお</rt>せます</p>

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
            <LocationPicker
              isSettingHome={isSettingHome}
              editingHazardId={editingHazardId}
              newHazardPos={newHazardPos}
              setHomePos={setHomePos}
              setMapCenter={setMapCenter}
              setIsSettingHome={setIsSettingHome}
              setNewHazardPos={setNewHazardPos}
            />
          </MapContainer>
          
          {/* Floating AI Chat Button */}
          <button
            onClick={() => setIsChatModalOpen(true)}
            style={{
              position: 'absolute',
              bottom: isMobile ? '80px' : '20px',
              right: '20px',
              zIndex: 1000,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '30px',
              padding: '0.7rem 1.2rem',
              fontSize: '0.95rem',
              fontWeight: 'bold',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>🤖</span>
            <span>あんぜん博士にきく</span>
          </button>

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
              <span>✍️</span> ここを <ruby>報告<rt>ほうこく</rt></ruby>する！
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
          paddingBottom: isMobile ? '80px' : '1.5rem'
        }}>
          {/* Form Section */}
          <section style={{ display: (!isMobile || activeTab === 'form') ? 'block' : 'none' }}>
            <h2 style={{ color: '#2C3E50', fontSize: isMobile ? '1.2rem' : '1.3rem', borderLeft: `6px solid ${editingHazardId ? '#3498DB' : '#E74C3C'}`, paddingLeft: '0.8rem', marginBottom: '1rem' }}>

              {editingHazardId ? <><ruby>報告<rt>ほうこく</rt></ruby>を <ruby>直<rt>なお</rt></ruby>す</> : <>あぶないよ！を おしえる</>}

              {editingHazardId ? 'ほうこくを なおす' : 'あぶないよ！を おしえる'}

            </h2>
            <div style={{ backgroundColor: editingHazardId ? '#EBF5FB' : '#FFF4F4', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem', border: `1px solid ${editingHazardId ? '#D6EAF8' : '#FFDADA'}` }}>
              <p style={{ fontSize: isMobile ? '0.9rem' : '0.95rem', color: editingHazardId ? '#2980B9' : '#C0392B', margin: 0, fontWeight: 'bold', lineHeight: '1.4' }}>
                {editingHazardId ? <><ruby>内容<rt>ないよう</rt></ruby>を 変<rt>か</rt>えて、「<ruby>直<rt>なお</rt></ruby>す！」ボタンを おしてね。</> : <>① <ruby>地図<rt>ちず</rt></ruby>で あぶない <ruby>場所<rt>ばしょ</rt></ruby>を ぽちっと えらんでね。② そのあと、「なにが あぶない？」を えらんでね。</>}
              </p>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label htmlFor="hazard-type-select" style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', fontSize: '1rem' }}>なにが あぶない？</label>
                <select id="hazard-type-select" value={type} onChange={e => setType(e.target.value)} style={{ 
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
                  <option value="Shelter">ひなんじょ 🏫</option>
                  <option value="AED">AED・きゅうきゅう 🫀</option>
                  <option value="Other">そのほか 🐾</option>
                  <option value="Traffic">車（くるま）・交通（こうつう） 🚗</option>
                  <option value="Crime">不審者（ふしんしゃ）・防犯（ぼうはん） 👮</option>
                  <option value="Disaster">地震（じしん）・火災（かさい） 🌊</option>
                  <option value="Lighting">道（みち）が 暗（くら）い・電気（でんき） 🌙</option>
                  <option value="Other">その他（そのほか） 🐾</option>
                </select>
              </div>

              <div>
                
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', fontSize: '1rem' }}><ruby>写真<rt>しゃしん</rt></ruby> 📸</label>


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
                
                <label htmlFor="hazard-image-input" style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', fontSize: '1rem' }}>しゃしん（かえるなら） 📸</label>


                <input 
                  id="hazard-image-input"
                  type="file" 
                  accept="image/*" 
                  onChange={e => setImageFile(e.target.files ? e.target.files[0] : null)} 
                  style={{ width: '100%', fontSize: '1rem' }}
                />
              </div>

              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', fontSize: '1rem' }}>どんな <ruby>感<rt>かん</rt></ruby>じ？</label>

     
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


                <label htmlFor="hazard-desc-input" style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', fontSize: '1rem' }}>どんな かんじ？</label>


                <textarea 
                  id="hazard-desc-input"
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
                  placeholder="例：道が 暗い、車が 多い"
                  required
                />
                
                {/* AI Assist Trigger Button */}
                <button
                  type="button"
                  onClick={handleAiAssist}
                  disabled={isAiAssisting}
                  style={{
                    marginTop: '0.5rem',
                    width: '100%',
                    padding: '0.6rem 1rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isAiAssisting ? 'wait' : 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                    opacity: isAiAssisting ? 0.7 : 1
                  }}
                >
                  <span>🤖</span> {isAiAssisting ? 'AIが かんがえちゅう...' : 'AIにおまかせ！ カテゴリ・危険度・せつめい自動アシスト'}
                </button>

                {/* AI Assist Result Preview Card */}
                {aiAssistPreview && (
                  <div style={{
                    marginTop: '0.8rem',
                    padding: '0.8rem',
                    borderRadius: '8px',
                    background: '#F5F3FF',
                    border: '1.5px solid #DDD6FE',
                    animation: 'fadeIn 0.3s ease-in-out'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#6D28D9', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span>✨</span> AIの分析結果
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        backgroundColor: aiAssistPreview.dangerLevel >= 4 ? '#FEE2E2' : aiAssistPreview.dangerLevel === 3 ? '#FEF3C7' : '#DCFCE7',
                        color: aiAssistPreview.dangerLevel >= 4 ? '#B91C1C' : aiAssistPreview.dangerLevel === 3 ? '#B45309' : '#15803D'
                      }}>
                        きけん度: {'⭐'.repeat(aiAssistPreview.dangerLevel)} (Lv.{aiAssistPreview.dangerLevel})
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: '#4C1D95', marginBottom: '0.4rem', lineHeight: '1.4' }}>
                      <strong>👶 こども向け:</strong> {aiAssistPreview.forKidsSummary}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.4rem' }}>
                      <strong>判定の理由:</strong> {aiAssistPreview.reason}
                    </div>

                    {aiAssistPreview.keywords.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {aiAssistPreview.keywords.map((kw, i) => (
                          <span key={i} style={{ fontSize: '0.7rem', background: '#EDE9FE', color: '#5B21B6', padding: '1px 6px', borderRadius: '4px' }}>
                            #{kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
                  {editingHazardId ? <><ruby>直<rt>なお</rt></ruby>す！</> : <><ruby>報告<rt>ほうこく</rt></ruby>する！</>}
                </button>
              </div>
            </form>
          </section>
          
          <hr style={{ border: 'none', borderTop: '1px solid #EEE', display: (!isMobile || (activeTab === 'form' || activeTab === 'list')) ? 'block' : 'none' }} />
          
            {/* List Section */}
          <section style={{ display: (!isMobile || activeTab === 'list') ? 'block' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ color: '#2C3E50', fontSize: isMobile ? '1.2rem' : '1.2rem', margin: 0 }}>みんなの ほうこく 🚩</h3>
              <span style={{ fontSize: '0.85rem', color: '#7F8C8D', fontWeight: 'bold' }}>{filteredHazards.length} 件</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredHazards.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#95A5A6', background: '#F8F9FA', borderRadius: '10px' }}>
                  <p style={{ fontSize: '2rem', margin: '0 0 0.5rem 0' }}>🍃</p>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>このカテゴリの ほうこくは まだありません。</p>
                </div>
              )}
              {filteredHazards.map(h => (

            <h3 style={{ color: '#2C3E50', fontSize: isMobile ? '1.2rem' : '1.2rem', marginBottom: '1rem' }}>みんなの <ruby>報告<rt>ほうこく</rt></ruby> 🚩</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {hazards.length === 0 && <p style={{ color: '#999' }}>まだ <ruby>報告<rt>ほうこく</rt></ruby>は ありません。</p>}
              {hazards.map(h => (

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

                    <span style={{ 
                      fontSize: '0.8rem', 
                      padding: '0.2rem 0.5rem', 
                      borderRadius: '4px', 
                      backgroundColor: '#2C3E50',
                      color: 'white'
                    }}>{typeShortLabels[h.type] || h.type}</span>

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
                        <ruby>直<rt>なお</rt></ruby>す📝
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: '1rem', margin: '0.5rem 0', color: '#333', fontWeight: '500' }}>{h.description}</p>
                  {h.imageUrl && (
                    <img src={h.imageUrl} alt="しゃしん" style={{ width: '100%', maxHeight: isMobile ? '200px' : '150px', objectFit: 'cover', marginTop: '0.5rem', borderRadius: '8px' }} />
                  )}

                  {/* AI Safety Advice in List */}
                  {h.aiAdvice && (
                    <div style={{ marginTop: '0.8rem', background: '#F0F7FF', padding: '0.8rem', borderRadius: '8px', border: '1px solid #BAE6FD' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#0369A1', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span>🤖</span> あんぜん博士のアドバイス
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#0C4A6E', marginBottom: '0.4rem', background: 'white', padding: '0.5rem', borderRadius: '6px', lineHeight: '1.4' }}>
                        <strong>👶 こども向け:</strong> {h.aiAdvice.forKids}
                      </div>
                      {h.aiAdvice.forAdults && (
                        <div style={{ fontSize: '0.8rem', color: '#334155', background: '#F8FAFC', padding: '0.4rem 0.5rem', borderRadius: '6px', lineHeight: '1.3' }}>
                          <strong>👥 おとな向け:</strong> {h.aiAdvice.forAdults}
                        </div>
                      )}
                    </div>
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

                        placeholder="ありがとう！ など..."
        
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
                        <ruby>送<rt>おく</rt></ruby>る
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {/* Area Summary Modal */}
      {isSummaryModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '100%',
            padding: '1.5rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            maxHeight: '85vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#2C3E50', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem' }}>
                <span>✨</span> 地域のあんぜんまとめ
              </h3>
              <button
                onClick={() => setIsSummaryModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#95A5A6' }}
              >
                ✕
              </button>
            </div>

            {isLoadingSummary ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#7F8C8D' }}>
                <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>🤖</span>
                <p>あんぜん博士が まちのようすを まとめています...</p>
              </div>
            ) : areaSummary ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: '#FFF8E1', padding: '1rem', borderRadius: '10px', border: '1px solid #FFE082' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#D97706', fontSize: '1rem' }}>
                    {areaSummary.summaryTitle}
                  </h4>
                  <p style={{ margin: 0, color: '#92400E', fontSize: '0.95rem', lineHeight: '1.5' }}>
                    <strong>👶 こどもたちへ:</strong><br />
                    {areaSummary.forKidsSummary}
                  </p>
                </div>

                <div style={{ background: '#F0F9FF', padding: '1rem', borderRadius: '10px', border: '1px solid #BAE6FD' }}>
                  <p style={{ margin: 0, color: '#0369A1', fontSize: '0.9rem', lineHeight: '1.4' }}>
                    <strong>👥 保護者・地域の皆様へ:</strong><br />
                    {areaSummary.forAdultsSummary}
                  </p>
                </div>

                <div>
                  <h5 style={{ margin: '0 0 0.5rem 0', color: '#2C3E50', fontSize: '0.9rem' }}>🎯 ちゅうもくポイント</h5>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#4B5563', fontSize: '0.85rem' }}>
                    {areaSummary.keyPoints.map((pt, i) => (
                      <li key={i} style={{ marginBottom: '0.3rem' }}>{pt}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}

            <button
              onClick={() => setIsSummaryModalOpen(false)}
              style={{
                marginTop: '1.2rem',
                width: '100%',
                padding: '0.8rem',
                background: '#2C3E50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              とじる
            </button>
          </div>
        </div>
      )}

      {/* Safety Chat Modal */}
      {isChatModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            maxWidth: '450px',
            width: '100%',
            height: '520px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            overflow: 'hidden'
          }}>
            {/* Chat Header */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🤖</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem' }}>あんぜん博士にしつもん</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>AI安全相談コーナー</p>
                </div>
              </div>
              <button
                onClick={() => setIsChatModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: 'white', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Chat Body */}
            <div style={{
              flex: 1,
              padding: '1rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.8rem',
              backgroundColor: '#F8FAFC'
            }}>
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%'
                  }}
                >
                  <div style={{
                    padding: '0.7rem 1rem',
                    borderRadius: '14px',
                    background: msg.sender === 'user' ? '#3B82F6' : 'white',
                    color: msg.sender === 'user' ? 'white' : '#1E293B',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                    fontSize: '0.9rem',
                    lineHeight: '1.4',
                    borderBottomRightRadius: msg.sender === 'user' ? '2px' : '14px',
                    borderBottomLeftRadius: msg.sender === 'bot' ? '2px' : '14px',
                  }}>
                    {msg.text}
                  </div>
                  {msg.adultText && (
                    <div style={{
                      marginTop: '0.3rem',
                      padding: '0.4rem 0.6rem',
                      background: '#F1F5F9',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      color: '#64748B',
                      lineHeight: '1.3'
                    }}>
                      👥 <strong>おとな向け:</strong> {msg.adultText}
                    </div>
                  )}
                </div>
              ))}
              {isChatSending && (
                <div style={{ alignSelf: 'flex-start', color: '#94A3B8', fontSize: '0.85rem' }}>
                  あんぜん博士が 考え中... 🤔
                </div>
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChatMessage} style={{
              padding: '0.8rem',
              display: 'flex',
              gap: '0.5rem',
              background: 'white',
              borderTop: '1px solid #E2E8F0'
            }}>
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="例: 暗い道を通るときはどうする？"
                style={{
                  flex: 1,
                  padding: '0.6rem 0.8rem',
                  borderRadius: '20px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isChatSending}
                style={{
                  background: '#3B82F6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '0.6rem 1rem',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  opacity: chatInput.trim() && !isChatSending ? 1 : 0.5
                }}
              >
                そうしん
              </button>
            </form>
          </div>
        </div>
      )}

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
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}><ruby>地図<rt>ちず</rt></ruby></span>
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
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}><ruby>一覧<rt>いちらん</rt></ruby></span>
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
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}><ruby>報告<rt>ほうこく</rt></ruby></span>
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

      {/* Floating Feedback Button */}
      <button
        onClick={() => setIsFeedbackOpen(true)}
        style={{
          position: 'fixed',
          bottom: isMobile ? '80px' : '25px',
          right: isMobile ? '15px' : '25px',
          zIndex: 1500,
          background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
          color: 'white',
          border: '3px solid white',
          borderRadius: '50px',
          padding: isMobile ? '0.6rem 1rem' : '0.8rem 1.4rem',
          fontSize: isMobile ? '0.85rem' : '1rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(255, 107, 107, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          transition: 'transform 0.2s ease',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <span style={{ fontSize: isMobile ? '1.1rem' : '1.3rem' }}>💌</span>
        <span><ruby>感想<rt>かんそう</rt></ruby>・ご<ruby>意見<rt>いけん</rt></ruby></span>
      </button>

      {/* Feedback Modal */}
      {isFeedbackOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 2500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            padding: isMobile ? '1.2rem' : '1.8rem',
            position: 'relative'
          }}>
            {/* Close button */}
            <button
              onClick={() => setIsFeedbackOpen(false)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: '#F1F2F6',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                fontSize: '1.2rem',
                cursor: 'pointer',
                color: '#7F8C8D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>

            {feedbackSubmitted ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <span style={{ fontSize: '4rem', display: 'block', marginBottom: '1rem' }}>🎉</span>
                <h3 style={{ color: '#27AE60', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                  おくりましタ！
                </h3>
                <p style={{ color: '#2C3E50', fontSize: '1.1rem', fontWeight: 'bold' }}>
                  <ruby>感想<rt>かんそう</rt></ruby>を おしえてくれて ありがとう！💖
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendFeedback}>
                <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
                  <span style={{ fontSize: '2.2rem' }}>💌</span>
                  <h2 style={{ margin: '0.3rem 0', color: '#2C3E50', fontSize: isMobile ? '1.2rem' : '1.4rem' }}>
                    みんなの <ruby>声<rt>こえ</rt></ruby>を きかせてね！
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#7F8C8D' }}>
                    アプリをもっと よくするための ヒントを おしえてね
                  </p>
                </div>

                {/* Role Switcher Tab */}
                <div style={{
                  display: 'flex',
                  background: '#F0F4F8',
                  borderRadius: '12px',
                  padding: '4px',
                  marginBottom: '1.2rem'
                }}>
                  <button
                    type="button"
                    onClick={() => setFeedbackRole('child')}
                    style={{
                      flex: 1,
                      padding: '0.6rem',
                      borderRadius: '10px',
                      border: 'none',
                      background: feedbackRole === 'child' ? '#FF6B6B' : 'transparent',
                      color: feedbackRole === 'child' ? 'white' : '#7F8C8D',
                      fontWeight: 'bold',
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    👦 こどもの かんそう
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackRole('parent')}
                    style={{
                      flex: 1,
                      padding: '0.6rem',
                      borderRadius: '10px',
                      border: 'none',
                      background: feedbackRole === 'parent' ? '#3498DB' : 'transparent',
                      color: feedbackRole === 'parent' ? 'white' : '#7F8C8D',
                      fontWeight: 'bold',
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    👨‍👩‍👧 ほごしゃ の ご意見
                  </button>
                </div>

                {feedbackRole === 'child' ? (
                  /* Child Feedback Form */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    {/* Q1: Ease */}
                    <div>
                      <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#2C3E50', fontSize: '0.95rem' }}>
                        1. つかいやすかった？
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                        {[
                          { key: 'easy', label: '😆 かんたん！', bg: '#2ECC71' },
                          { key: 'normal', label: '😊 ふつう', bg: '#F1C40F' },
                          { key: 'hard', label: '😵 むずかしい', bg: '#E74C3C' }
                        ].map(opt => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => setChildEase(opt.key as any)}
                            style={{
                              padding: '0.6rem 0.3rem',
                              borderRadius: '12px',
                              border: childEase === opt.key ? `3px solid ${opt.bg}` : '2px solid #E2E8F0',
                              background: childEase === opt.key ? `${opt.bg}22` : 'white',
                              color: '#2C3E50',
                              fontWeight: childEase === opt.key ? 'bold' : 'normal',
                              fontSize: '0.85rem',
                              cursor: 'pointer'
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Q2: Readability */}
                    <div>
                      <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#2C3E50', fontSize: '0.95rem' }}>
                        2. もじ は よみやすかった？
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                        {[
                          { key: 'readable', label: '📖 ぜんぶ よめた', bg: '#2ECC71' },
                          { key: 'some_hard', label: '🤔 すこし むずかしい', bg: '#F39C12' },
                          { key: 'unreadable', label: '❌ よみにくい', bg: '#E74C3C' }
                        ].map(opt => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => setChildReadability(opt.key as any)}
                            style={{
                              padding: '0.6rem 0.2rem',
                              borderRadius: '12px',
                              border: childReadability === opt.key ? `3px solid ${opt.bg}` : '2px solid #E2E8F0',
                              background: childReadability === opt.key ? `${opt.bg}22` : 'white',
                              color: '#2C3E50',
                              fontWeight: childReadability === opt.key ? 'bold' : 'normal',
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Q3: Liked */}
                    <div>
                      <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.3rem', color: '#2C3E50', fontSize: '0.95rem' }}>
                        3. すきな マーク や おもしろかった ところ
                      </label>
                      <input
                        type="text"
                        placeholder="例: くるまのマークが かっこいい！"
                        value={childLiked}
                        onChange={e => setChildLiked(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.7rem',
                          borderRadius: '10px',
                          border: '2px solid #E2E8F0',
                          fontSize: '0.9rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Q4: Needs fix */}
                    <div>
                      <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.3rem', color: '#2C3E50', fontSize: '0.95rem' }}>
                        4. ここを なおしてほしい・むずかしかった ところ
                      </label>
                      <input
                        type="text"
                        placeholder="例: ボタンの ばしょが よくわからなかった"
                        value={childNeedsFix}
                        onChange={e => setChildNeedsFix(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.7rem',
                          borderRadius: '10px',
                          border: '2px solid #E2E8F0',
                          fontSize: '0.9rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  /* Parent Feedback Form */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    {/* Rating */}
                    <div>
                      <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.4rem', color: '#2C3E50', fontSize: '0.95rem' }}>
                        総合満足度・おすすめ度
                      </label>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setParentRating(star)}
                            style={{
                              background: 'none',
                              border: 'none',
                              fontSize: '1.8rem',
                              cursor: 'pointer',
                              padding: '2px',
                              opacity: star <= parentRating ? 1 : 0.3
                            }}
                          >
                            ⭐
                          </button>
                        ))}
                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#7F8C8D', marginLeft: '0.5rem' }}>
                          {parentRating} / 5 点
                        </span>
                      </div>
                    </div>

                    {/* Child Age */}
                    <div>
                      <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.3rem', color: '#2C3E50', fontSize: '0.95rem' }}>
                        お子様の学年・ご年齢
                      </label>
                      <input
                        type="text"
                        placeholder="例: 小学2年生、6歳 など"
                        value={parentChildAge}
                        onChange={e => setParentChildAge(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.7rem',
                          borderRadius: '10px',
                          border: '2px solid #E2E8F0',
                          fontSize: '0.9rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Usability */}
                    <div>
                      <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.3rem', color: '#2C3E50', fontSize: '0.95rem' }}>
                        お子様一人での操作のしやすさ
                      </label>
                      <select
                        value={parentUsability}
                        onChange={e => setParentUsability(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.7rem',
                          borderRadius: '10px',
                          border: '2px solid #E2E8F0',
                          fontSize: '0.9rem',
                          boxSizing: 'border-box',
                          background: 'white'
                        }}
                      >
                        <option value="とても使いやすい">とても使いやすい（1人で迷わず操作できた）</option>
                        <option value="使いやすい">使いやすい（少し教えれば使えた）</option>
                        <option value="普通">普通（大人のサポートが必要）</option>
                        <option value="改善が必要">改善が必要（操作でつまずく箇所が多かった）</option>
                      </select>
                    </div>

                    {/* Comments */}
                    <div>
                      <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.3rem', color: '#2C3E50', fontSize: '0.95rem' }}>
                        ご意見・改善要望・気づいた点
                      </label>
                      <textarea
                        rows={3}
                        placeholder="例: ルビがあって読みやすそうだった / 通学路のルート線が引けるとより嬉しい"
                        value={parentComment}
                        onChange={e => setParentComment(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.7rem',
                          borderRadius: '10px',
                          border: '2px solid #E2E8F0',
                          fontSize: '0.9rem',
                          boxSizing: 'border-box',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.8rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsFeedbackOpen(false)}
                    style={{
                      flex: 1,
                      padding: '0.8rem',
                      background: '#ECEFF1',
                      border: 'none',
                      borderRadius: '50px',
                      color: '#546E7A',
                      fontWeight: 'bold',
                      fontSize: '0.95rem',
                      cursor: 'pointer'
                    }}
                  >
                    やめる
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingFeedback}
                    style={{
                      flex: 2,
                      padding: '0.8rem',
                      background: feedbackRole === 'child' ? '#FF6B6B' : '#3498DB',
                      border: 'none',
                      borderRadius: '50px',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      boxShadow: feedbackRole === 'child' ? '0 4px 0 #E74C3C' : '0 4px 0 #2980B9',
                      opacity: isSubmittingFeedback ? 0.7 : 1
                    }}
                  >
                    {isSubmittingFeedback ? '送信中...' : '💌 送信する！✨'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

export default App;
