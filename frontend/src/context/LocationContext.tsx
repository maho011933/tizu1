import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface LocationPoint {
  lat: number;
  lng: number;
  accuracy: number | null;
  timestamp: number;
  speed: number | null;
}

interface LocationContextType {
  userPos: [number, number] | null;
  accuracy: number | null;
  isTracking: boolean;
  locationHistory: LocationPoint[];
  error: string | null;
  startTracking: () => void;
  stopTracking: () => void;
  clearHistory: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState<boolean>(true);
  const [locationHistory, setLocationHistory] = useState<LocationPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  const handlePositionSuccess = useCallback((position: GeolocationPosition) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const acc = position.coords.accuracy;
    const spd = position.coords.speed;
    const point: LocationPoint = {
      lat,
      lng,
      accuracy: acc,
      timestamp: position.timestamp,
      speed: spd
    };

    setUserPos([lat, lng]);
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
  }, []);

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
        isTracking,
        locationHistory,
        error,
        startTracking,
        stopTracking,
        clearHistory
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
};
