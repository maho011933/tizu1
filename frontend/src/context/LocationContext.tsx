import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export interface LocationPoint {
  lat: number;
  lng: number;
  accuracy: number | null;
  timestamp: number;
  speed: number | null;
}

export interface AvatarOption {
  id: string;
  emoji: string;
  label: string;
  color: string;
  type: 'walk' | 'vehicle' | 'pet';
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'boy', emoji: '👦', label: 'おとこのこ', color: '#3498DB', type: 'walk' },
  { id: 'girl', emoji: '👧', label: 'おんなのこ', color: '#FF6B6B', type: 'walk' },
  { id: 'bike', emoji: '🚴‍♂️', label: 'じてんしゃ', color: '#2ECC71', type: 'vehicle' },
  { id: 'car', emoji: '🚗', label: 'くるま', color: '#E67E22', type: 'vehicle' },
  { id: 'cat', emoji: '🐱', label: 'ネコちゃん', color: '#F1C40F', type: 'pet' },
  { id: 'dog', emoji: '🐶', label: 'イヌちゃん', color: '#9B59B6', type: 'pet' },
  { id: 'robot', emoji: '🤖', label: 'ロボット', color: '#1ABC9C', type: 'walk' },
];

interface LocationContextType {
  userPos: [number, number] | null;
  accuracy: number | null;
  heading: number | null;
  isMoving: boolean;
  isTracking: boolean;
  locationHistory: LocationPoint[];
  error: string | null;
  avatar: string;
  setAvatar: (avatarId: string) => void;
  isSimulating: boolean;
  toggleSimulation: () => void;
  startTracking: () => void;
  stopTracking: () => void;
  clearHistory: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

// 大円距離に基づく方位角（0〜360度）の計算
function calculateHeading(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const y = Math.sin(dLng) * Math.cos(lat2 * (Math.PI / 180));
  const x = Math.cos(lat1 * (Math.PI / 180)) * Math.sin(lat2 * (Math.PI / 180)) -
            Math.sin(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.cos(dLng);
  let brng = Math.atan2(y, x) * (180 / Math.PI);
  return (brng + 360) % 360;
}

export const LocationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [isTracking, setIsTracking] = useState<boolean>(true);
  const [locationHistory, setLocationHistory] = useState<LocationPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  
  // アバター選択 (ローカルストレージに保存)
  const [avatar, setAvatarState] = useState<string>(() => {
    return localStorage.getItem('user_avatar') || 'boy';
  });

  // おさんぽデモシミュレーション
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const setAvatar = useCallback((newAvatarId: string) => {
    setAvatarState(newAvatarId);
    localStorage.setItem('user_avatar', newAvatarId);
  }, []);

  const handlePositionSuccess = useCallback((position: GeolocationPosition) => {
    if (isSimulating) return; // シミュレーション中は実際の位置を上書きしない

    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const acc = position.coords.accuracy;
    const spd = position.coords.speed;
    const gpsHeading = position.coords.heading;

    const point: LocationPoint = {
      lat,
      lng,
      accuracy: acc,
      timestamp: position.timestamp,
      speed: spd
    };

    setUserPos(prevPos => {
      if (prevPos) {
        const [prevLat, prevLng] = prevPos;
        const dist = Math.hypot(lat - prevLat, lng - prevLng) * 111000;
        
        if (dist > 1.5) { // 1.5メートル以上動いた場合
          setIsMoving(true);
          const computedHeading = calculateHeading(prevLat, prevLng, lat, lng);
          setHeading(gpsHeading !== null && !isNaN(gpsHeading) ? gpsHeading : computedHeading);
        } else {
          setIsMoving(false);
        }
      }
      return [lat, lng];
    });

    setAccuracy(acc);
    setError(null);

    setLocationHistory(prev => {
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        const dist = Math.hypot(lat - last.lat, lng - last.lng) * 111000;
        if (dist < 3) return prev;
      }
      return [...prev.slice(-49), point];
    });
  }, [isSimulating]);

  const handlePositionError = useCallback((err: GeolocationPositionError) => {
    let msg = '位置情報の取得に失敗しました';
    if (err.code === err.PERMISSION_DENIED) {
      msg = '位置情報の使用が許可されていません';
    } else if (err.code === err.POSITION_UNAVAILABLE) {
      msg = '位置情報が利用できません';
    } else if (err.code === err.TIMEOUT) {
      msg = '位置情報の取得がタイムアウトしました';
    }
    setError(msg);
    console.warn("Geolocation watch error:", err);
  }, []);

  const startTracking = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("お使いのブラウザは位置情報(Geolocation)に対応していません");
      return;
    }

    if (watchId !== null) return;

    const id = navigator.geolocation.watchPosition(
      handlePositionSuccess,
      handlePositionError,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 1000
      }
    );
    setWatchId(id);
    setIsTracking(true);
  }, [watchId, handlePositionSuccess, handlePositionError]);

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
  }, [watchId]);

  const clearHistory = useCallback(() => {
    setLocationHistory([]);
  }, []);

  const toggleSimulation = useCallback(() => {
    setIsSimulating(prev => !prev);
  }, []);

  // おさんぽデモシミュレーションの処理ループ
  useEffect(() => {
    if (!isSimulating) return;

    // 現在地がなければ東京駅付近を初期位置に設定
    const baseLat = userPos ? userPos[0] : 35.681236;
    const baseLng = userPos ? userPos[1] : 139.767125;

    let step = 0;
    const radius = 0.0015; // 周回半径

    setIsMoving(true);

    const interval = setInterval(() => {
      step += 1;
      const angle = (step * 8) * (Math.PI / 180);
      const nextLat = baseLat + radius * Math.sin(angle);
      const nextLng = baseLng + radius * Math.cos(angle);

      // 移動方向の角度
      const nextAngleDeg = ((step * 8) + 90) % 360;

      setUserPos([nextLat, nextLng]);
      setHeading(nextAngleDeg);
      setAccuracy(5);

      setLocationHistory(prev => [
        ...prev.slice(-49),
        {
          lat: nextLat,
          lng: nextLng,
          accuracy: 5,
          timestamp: Date.now(),
          speed: 1.2
        }
      ]);
    }, 800);

    return () => {
      clearInterval(interval);
      setIsMoving(false);
    };
  }, [isSimulating, userPos]);

  // 移動判定の自動停止タイマー（実測時）
  useEffect(() => {
    if (isSimulating) return;
    if (isMoving) {
      const timer = setTimeout(() => {
        setIsMoving(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isMoving, isSimulating]);

  useEffect(() => {
    if (isTracking) {
      startTracking();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isTracking && watchId === null) {
        startTracking();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isTracking, startTracking, watchId]);

  return (
    <LocationContext.Provider
      value={{
        userPos,
        accuracy,
        heading,
        isMoving,
        isTracking,
        locationHistory,
        error,
        avatar,
        setAvatar,
        isSimulating,
        toggleSimulation,
        startTracking,
        stopTracking,
        clearHistory
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (!context) {
    return {
      userPos: null,
      accuracy: null,
      heading: null,
      isMoving: false,
      isTracking: false,
      locationHistory: [],
      error: null,
      avatar: 'boy',
      setAvatar: () => {},
      isSimulating: false,
      toggleSimulation: () => {},
      startTracking: () => {},
      stopTracking: () => {},
      clearHistory: () => {}
    };
  }
  return context;
};

