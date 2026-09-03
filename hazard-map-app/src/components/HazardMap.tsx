import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Navigation, 
  Settings, 
  Volume2, 
  X, 
  Info, 
  Search, 
  Layers, 
  ShieldAlert, 
  Check, 
  Play, 
  Pause,
  AlertTriangle
} from 'lucide-react';

// Fix for default marker icons in Leaflet
// @ts-ignore
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, {
      duration: 1.5,
      easeLinearity: 0.25
    });
  }, [center, zoom, map]);
  return null;
}

function MapEventsHandler({ 
  onMapClick, 
  onMoveEnd, 
  enabled 
}: { 
  onMapClick: (lat: number, lng: number) => void, 
  onMoveEnd: (lat: number, lng: number) => void, 
  enabled: boolean 
}) {
  useMapEvents({
    click: (e) => {
      if (enabled) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
    moveend: (e) => {
      const map = e.target;
      const center = map.getCenter();
      onMoveEnd(center.lat, center.lng);
    }
  });
  return null;
}

interface HazardPoint {
  id: string;
  lat: number;
  lng: number;
  type: 'accident' | 'flood' | 'evacuation' | 'landslide';
  severity: 'low' | 'medium' | 'high' | 'extreme';
  description: string;
  pinpointDetail?: string; // Specific reason/detail
}

const DEFAULT_SOUNDS = [
  { id: 'simple', label: 'シンプル (ピッ)', url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
  { id: 'chime', label: 'チャイム (ポーン)', url: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3' },
  { id: 'warn', label: '警告音 (ピピピッ)', url: 'https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3' },
];

const NATIONWIDE_LAYERS = [
  { id: 'flood_layer', label: '浸水想定区域', url: 'https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_data/{z}/{x}/{y}.png', attribution: '国土地理院', color: 'bg-cyan-500' },
  { id: 'landslide_layer', label: '土砂災害警戒区域', url: 'https://disaportaldata.gsi.go.jp/raster/05_toshakeikai_all/{z}/{x}/{y}.png', attribution: '国土地理院', color: 'bg-amber-700' },
  { id: 'tsunami_layer', label: '津波浸水想定区域', url: 'https://disaportaldata.gsi.go.jp/raster/04_tsunami_newlegend_data/{z}/{x}/{y}.png', attribution: '国土地理院', color: 'bg-rose-500' },
];

const BASE_MAPS = {
  pale: { label: '淡色地図 (見やすい・推奨)', url: 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png' },
  std: { label: '標準地図 (OSM)', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' },
  photo: { label: '航空写真 (地理院)', url: 'https://cyberjapandata.gsi.go.jp/xyz/ort/{z}/{x}/{y}.jpg' },
};

// Generates mock hazards around a coordinate to ensure content shows up automatically anywhere in Japan
const generateHazardsForLocation = (centerLat: number, centerLng: number): HazardPoint[] => {
  const mockDescriptions: Record<HazardPoint['type'], { desc: string, detail: string }[]> = {
    accident: [
      { desc: '交通安全注意: 見通しの悪い交差点', detail: '信号のない交差点で、出会い頭の衝突事故が多発しています。一時停止と左右の安全確認を徹底してください。' },
      { desc: '交通安全注意: 車両と歩行者の錯綜エリア', detail: '歩道が狭く、歩行者と自転車・自動車の接触リスクが高い場所です。十分減速して通行してください。' },
      { desc: 'スピード注意: 夜間横断者注意地点', detail: '夜間に歩行者の横断が見落とされやすいエリアです。速度を落とし、ヘッドライトのハイビーム活用も検討してください。' }
    ],
    flood: [
      { desc: '浸水注意エリア: 周囲より低い地形', detail: '局地的な大雨の際、短時間で急激に冠水するおそれがある低地です。集中豪雨時は進入を避けて迂回してください。' },
      { desc: '浸水注意エリア: 河川の氾濫想定区域', detail: '大雨による近隣河川の増水・氾濫の際に、最大で1.0m程度の浸水被害が想定されているエリアです。' }
    ],
    landslide: [
      { desc: '土砂災害警戒区域: 急傾斜地付近', detail: '大雨や長雨、地震の後にがけ崩れが発生しやすい箇所です。斜面から水が湧き出る等の前兆現象に警戒してください。' }
    ],
    evacuation: [
      { desc: '指定緊急避難場所: 地元小学校', detail: '洪水・地震時の避難場所として指定されています。体育館と運動場が利用可能です。防災備蓄品も配備されています。' },
      { desc: '避難所: 地域市民センター', detail: '災害時の一次避難所です。バリアフリー設計となっており、多目的室や福祉スペースが確保されています。' }
    ]
  };

  const newHazards: HazardPoint[] = [];
  const types: HazardPoint['type'][] = ['accident', 'flood', 'landslide', 'evacuation'];

  // Seed 6 points around the center
  const count = 6;
  for (let i = 0; i < count; i++) {
    // Generate within 300m to 1200m
    const angle = Math.random() * Math.PI * 2;
    const distance = 0.003 + Math.random() * 0.008; // approx 300m - 1.2km
    const lat = centerLat + Math.sin(angle) * distance;
    const lng = centerLng + Math.cos(angle) * distance * 1.2; // Adjust for longitudinal scaling
    
    const type = types[i % types.length];
    const templates = mockDescriptions[type];
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    newHazards.push({
      id: `gen-${centerLat.toFixed(4)}-${centerLng.toFixed(4)}-${type}-${i}-${Math.floor(Math.random() * 1000)}`,
      lat,
      lng,
      type,
      severity: i % 3 === 0 ? 'high' : (i % 3 === 1 ? 'medium' : 'low'),
      description: template.desc,
      pinpointDetail: template.detail
    });
  }
  
  return newHazards;
};

const HazardMap: React.FC = () => {
  // State variables
  const [position, setPosition] = useState<[number, number]>([35.6812, 139.7671]); // Default to Tokyo Station
  const [zoom, setZoom] = useState(15);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // Custom Settings (Point 2: Customized Notification rules & Point 3: Simple Operations)
  const [notificationSound, setNotificationSound] = useState<string>(DEFAULT_SOUNDS[0].url);
  const [alertDistance, setAlertDistance] = useState(100); // meters (presets will allow 50m, 100m, etc.)
  const [enabledTypes, setEnabledTypes] = useState<string[]>(['accident', 'flood', 'landslide']); // User preferences
  
  const [activeAlert, setActiveAlert] = useState<HazardPoint | null>(null);
  const [activeAlertDistance, setActiveAlertDistance] = useState<number | null>(null);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  
  // Map Layer Settings
  const [activeNationwideLayers, setActiveNationwideLayers] = useState<string[]>(['flood_layer', 'landslide_layer']);
  const [layerOpacity, setLayerOpacity] = useState(0.6);
  const [baseMap, setBaseMap] = useState<keyof typeof BASE_MAPS>('pale');
  
  // Ref for audio element
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Hazard list state
  const [hazards, setHazards] = useState<HazardPoint[]>([
    { 
      id: 'yamagata-1', lat: 38.3420, lng: 140.3680, type: 'accident', severity: 'high', 
      description: '交通安全注意: 国道13号線交差点付近', 
      pinpointDetail: '見通しの悪い交差点のため、右折車と直進車の衝突事故が多発しています。特に夕暮れ時は注意が必要です。' 
    },
    { 
      id: 'yamagata-2', lat: 38.3450, lng: 140.3600, type: 'flood', severity: 'medium', 
      description: '浸水注意エリア: 押切川周辺', 
      pinpointDetail: '周囲より地盤が2メートル低くなっており、短時間の集中豪雨（時間50mm以上）で道路冠水の恐れがあります。' 
    },
    { 
      id: 'yamagata-3', lat: 38.3370, lng: 140.3650, type: 'evacuation', severity: 'low', 
      description: '指定避難所: 天童市スポーツセンター', 
      pinpointDetail: '耐震補強済み。洪水・土砂災害どちらの際も避難可能です。' 
    },
    { 
      id: 'yamagata-4', lat: 38.3480, lng: 140.3700, type: 'landslide', severity: 'high', 
      description: '土砂災害注意区域: 山沿い斜面', 
      pinpointDetail: '傾斜30度以上の急傾斜地。大雨警報発令時には、斜面から小石が落ちてくる等の前兆現象に注意してください。' 
    },
  ]);

  // Point 1: Automatically generate hazards when map center position is set
  useEffect(() => {
    const newItems = generateHazardsForLocation(position[0], position[1]);
    setHazards(prev => {
      const existingIds = new Set(prev.map(h => h.id));
      const uniqueNew = newItems.filter(h => !existingIds.has(h.id));
      return [...prev, ...uniqueNew];
    });
  }, [position]);

  // Geolocation setup
  useEffect(() => {
    if (!isSimulationMode && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setPosition([latitude, longitude]);
          setUserLocation([latitude, longitude]);
          setZoom(15);
        },
        (err) => console.error("Initial location fix failed:", err)
      );

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation([latitude, longitude]);
          checkProximity(latitude, longitude);
        },
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [alertDistance, enabledTypes, isSimulationMode, hazards]);

  // Distance helper
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  // Proximity Alert evaluation (Find closest danger)
  const checkProximity = (lat: number, lng: number) => {
    const dangerousHazards = hazards.filter(h => h.type !== 'evacuation' && enabledTypes.includes(h.type));
    let closestHazard: HazardPoint | null = null;
    let minDistance = Infinity;

    for (const hazard of dangerousHazards) {
      const dist = calculateDistance(lat, lng, hazard.lat, hazard.lng);
      if (dist < alertDistance) {
        if (dist < minDistance) {
          minDistance = dist;
          closestHazard = hazard;
        }
      }
    }

    if (closestHazard) {
      setActiveAlertDistance(Math.round(minDistance));
      if (!activeAlert || activeAlert.id !== closestHazard.id) {
        triggerAlert(closestHazard);
      }
    } else {
      setActiveAlert(null);
      setActiveAlertDistance(null);
    }
  };

  const triggerAlert = (hazard: HazardPoint) => {
    setActiveAlert(hazard);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log("Audio play blocked by browser:", e));
    }
  };

  const initAudio = () => {
    if (!audioInitialized && audioRef.current) {
      audioRef.current.play()
        .then(() => {
          setAudioInitialized(true);
        })
        .catch(() => {
          setAudioInitialized(true);
        });
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    initAudio();
    if (isSimulationMode) {
      setUserLocation([lat, lng]);
      checkProximity(lat, lng);
    }
  };

  // Generate hazards when manually dragging/scrolling the map
  const handleMoveEnd = (lat: number, lng: number) => {
    const newItems = generateHazardsForLocation(lat, lng);
    setHazards(prev => {
      const existingIds = new Set(prev.map(h => h.id));
      const uniqueNew = newItems.filter(h => !existingIds.has(h.id));
      return [...prev, ...uniqueNew];
    });
  };

  const toggleNationwideLayer = (layerId: string) => {
    setActiveNationwideLayers(prev => 
      prev.includes(layerId) ? prev.filter(id => id !== layerId) : [...prev, layerId]
    );
  };

  const toggleEnabledType = (type: string) => {
    setEnabledTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    initAudio();
    
    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=jp`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newLat = parseFloat(lat);
        const newLng = parseFloat(lon);
        setPosition([newLat, newLng]);
        if (isSimulationMode) {
          setUserLocation([newLat, newLng]);
        }
        setZoom(16);
      } else {
        alert('指定された場所が見つかりませんでした。日本国内の都市名、地名、駅名などを入力してください。');
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('場所の検索中にエラーが発生しました。インターネット接続を確認してください。');
    } finally {
      setIsSearching(false);
    }
  };

  const testSound = (soundUrl: string) => {
    initAudio();
    const audio = new Audio(soundUrl);
    audio.play().catch(e => console.log("Sound play error:", e));
  };

  // Generate custom HTML markers for hazard types
  const getMarkerIcon = (type: HazardPoint['type']) => {
    let color = '#10b981'; // Green (default)
    let iconPath = '';
    
    if (type === 'accident') {
      color = '#ef4444'; // Red
      iconPath = '<path d="M12 2L2 22h20L12 2zm0 13h-1v-4h1v4zm0 2h-1v-1h1v1z" fill="currentColor"/>';
    } else if (type === 'flood') {
      color = '#eab308'; // Amber/Yellow
      iconPath = '<path d="M12 21c-4.418 0-8-3.582-8-8 0-4.418 8-13 8-13s8 8.582 8 13c0 4.418-3.582 8-8 8z" fill="currentColor"/>';
    } else if (type === 'landslide') {
      color = '#a16207'; // Yellow-Brown
      iconPath = '<path d="M22 21H2L12 3l10 18z" fill="currentColor"/>';
    } else if (type === 'evacuation') {
      color = '#3b82f6'; // Blue
      iconPath = '<path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill="currentColor"/>';
    }

    return L.divIcon({
      html: `<div class="relative group" style="background-color: ${color}; width: 34px; height: 34px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);">
              <svg viewBox="0 0 24 24" width="16" height="16">${iconPath}</svg>
              <div class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center shadow">
                <span class="w-2 h-2 rounded-full" style="background-color: ${color}; animate: ping 1.5s infinite"></span>
              </div>
             </div>`,
      className: 'custom-marker',
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-900 overflow-hidden font-sans text-slate-100 select-none">
      <audio ref={audioRef} src={notificationSound} />
      
      {/* 1. Header: Search and Status Info */}
      <header className="absolute top-6 left-1/2 -translate-x-1/2 w-[92%] max-w-xl z-[2000] pointer-events-none flex flex-col gap-3">
        {/* Search Input Bar (Glassmorphic) */}
        <form onSubmit={handleSearch} className="pointer-events-auto relative flex items-center bg-white/90 backdrop-blur-xl border border-white/60 shadow-2xl rounded-full px-5 py-4 w-full transition-all hover:bg-white focus-within:ring-4 focus-within:ring-blue-500/20">
          <Search className="text-slate-400 shrink-0 mr-3" size={22} />
          <input 
            type="text" 
            placeholder="地区名、駅名、または住所で検索..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none text-slate-800 text-base font-bold placeholder-slate-400 focus:outline-none focus:ring-0 p-0"
          />
          {isSearching ? (
            <div className="w-5 h-5 border-3 border-blue-600 border-t-transparent rounded-full animate-spin ml-2 shrink-0" />
          ) : (
            <button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs px-4 py-2 rounded-full transition shadow-lg shadow-blue-500/35 shrink-0 ml-2"
            >
              検索
            </button>
          )}
        </form>

        {/* Dynamic Simulation Mode Status Panel */}
        {isSimulationMode && (
          <div className="pointer-events-auto bg-gradient-to-r from-amber-500 to-orange-600 border-2 border-white text-white py-2.5 px-5 rounded-2xl shadow-xl flex items-center justify-between text-xs font-black animate-pulse">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-white rounded-full animate-ping" />
              🚗 テスト走行中: 地図をタップした位置に仮想移動します
            </span>
            <button 
              onClick={() => setIsSimulationMode(false)}
              className="bg-white/20 hover:bg-white/30 text-white rounded-full p-1 transition"
              title="終了"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </header>

      {/* Main Viewport Container */}
      <main className="flex-1 relative w-full h-full">
        {/* Leaflet Map */}
        <MapContainer center={position} zoom={zoom} className="h-full w-full z-[100]" zoomControl={false}>
          <TileLayer
            attribution={baseMap === 'std' ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' : '国土地理院'}
            url={BASE_MAPS[baseMap].url}
          />
          
          {/* Official Hazard layers layered from MLIT */}
          {NATIONWIDE_LAYERS.map(layer => activeNationwideLayers.includes(layer.id) && (
            <TileLayer
              key={layer.id}
              url={layer.url}
              opacity={layerOpacity}
              attribution={layer.attribution}
              zIndex={120}
            />
          ))}

          {/* Event and view controllers */}
          <ChangeView center={position} zoom={zoom} />
          <MapEventsHandler onMapClick={handleMapClick} onMoveEnd={handleMoveEnd} enabled={isSimulationMode} />
          
          {/* User Location Radar and marker */}
          {userLocation && (
            <Circle 
              center={userLocation} 
              radius={alertDistance} 
              pathOptions={{ 
                fillColor: '#3b82f6', 
                color: '#3b82f6', 
                fillOpacity: 0.08, 
                weight: 1.5, 
                dashArray: '4, 6' 
              }}
            />
          )}

          {userLocation && (
            <Marker 
              position={userLocation} 
              icon={L.divIcon({
                html: `<div class="relative flex items-center justify-center">
                        <div class="absolute w-8 h-8 bg-blue-500/30 rounded-full animate-ping"></div>
                        <div class="w-5 h-5 bg-blue-600 rounded-full border-3 border-white shadow-2xl ring-4 ring-blue-500/20"></div>
                       </div>`,
                className: 'user-location-marker',
                iconSize: [32, 32],
                iconAnchor: [16, 16],
              })}
            />
          )}

          {/* Render hazard points filtered by type checks */}
          {hazards
            .filter(h => enabledTypes.includes(h.type) || h.type === 'evacuation')
            .map((hazard) => (
              <Marker 
                key={hazard.id} 
                position={[hazard.lat, hazard.lng]} 
                icon={getMarkerIcon(hazard.type)}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="p-3 max-w-[240px]">
                    <h3 className="font-extrabold text-sm flex items-center gap-1.5 mb-1.5 text-slate-800">
                      {hazard.type === 'accident' && '⚠️ 交通安全危険地点'}
                      {hazard.type === 'flood' && '🌊 浸水危険エリア'}
                      {hazard.type === 'landslide' && '⛰️ 土砂災害警戒区域'}
                      {hazard.type === 'evacuation' && '🏠 指定避難所'}
                    </h3>
                    <p className="text-xs font-bold text-slate-700 leading-relaxed border-b border-slate-100 pb-1.5 mb-1.5">{hazard.description}</p>
                    {hazard.pinpointDetail && (
                      <div className="bg-amber-50/80 p-2 rounded-lg border border-amber-100/50">
                        <p className="text-[9px] text-amber-900 font-extrabold flex items-center gap-1">
                          <Info size={10} /> ピンポイントリスク情報
                        </p>
                        <p className="text-[10px] text-amber-800 mt-0.5 leading-relaxed font-medium">{hazard.pinpointDetail}</p>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>

        {/* 2. Top Warning Banner: Alert Notification Toast */}
        {activeAlert && activeAlertDistance !== null && (
          <div className="absolute top-28 left-1/2 -translate-x-1/2 w-[92%] max-w-lg z-[2000] flex flex-col gap-2.5 animate-in fade-in slide-in-from-top duration-500">
            {/* Warning Announcement */}
            <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white p-5 rounded-[28px] shadow-2xl flex items-center gap-4 border-2 border-white/80">
              <div className="bg-white/20 p-2.5 rounded-2xl animate-bounce">
                <AlertTriangle size={28} className="text-white" />
              </div>
              <div className="flex-1">
                <span className="font-black text-lg tracking-tight block leading-tight mb-0.5">
                  危険エリアに接近中！
                </span>
                <span className="text-xs opacity-90 font-bold">
                  {activeAlert.description} (約 {activeAlertDistance}m)
                </span>
              </div>
              <button 
                onClick={() => {
                  setActiveAlert(null);
                  setActiveAlertDistance(null);
                }} 
                className="bg-white/10 hover:bg-white/20 rounded-full p-2 transition self-center"
              >
                <X size={16} />
              </button>
            </div>
            
            {/* Additional info detail */}
            {activeAlert.pinpointDetail && (
              <div className="bg-white/95 backdrop-blur-xl p-5 rounded-[28px] shadow-2xl border border-white/50 animate-in zoom-in duration-500 delay-150">
                <div className="flex items-center gap-1.5 mb-2 text-rose-600">
                  <Info size={16} />
                  <span className="font-black text-[10px] tracking-wider uppercase">詳細な危険分析</span>
                </div>
                <p className="text-xs font-bold text-slate-700 leading-relaxed italic">
                  "{activeAlert.pinpointDetail}"
                </p>
              </div>
            )}
          </div>
        )}

        {/* 3. Bottom Navigation Control Dock (Point 3: Ultra Simple Operations) */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-sm">
          <div className="bg-white/90 backdrop-blur-xl border border-white/60 p-4 rounded-[36px] shadow-2xl flex justify-around items-center gap-2">
            
            {/* BUTTON 1: Current Location */}
            <button 
              onClick={() => {
                initAudio();
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      const { latitude, longitude } = pos.coords;
                      setPosition([latitude, longitude]);
                      setUserLocation([latitude, longitude]);
                      setZoom(16);
                    },
                    () => alert("現在地を取得できませんでした。ブラウザの位置情報設定を確認してください。")
                  );
                }
              }}
              className="flex flex-col items-center gap-1.5 transition active:scale-95 group"
            >
              <div className="w-14 h-14 bg-blue-50 text-blue-600 hover:bg-blue-100/80 rounded-full flex items-center justify-center shadow-md transition-all group-hover:shadow-lg">
                <Navigation size={24} className="fill-blue-600" />
              </div>
              <span className="text-[11px] font-black text-slate-600">現在地</span>
            </button>

            {/* BUTTON 2: Test Run (Simulation Mode) */}
            <button 
              onClick={() => {
                initAudio();
                setIsSimulationMode(!isSimulationMode);
              }}
              className="flex flex-col items-center gap-1.5 transition active:scale-95 group"
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all ${
                isSimulationMode 
                  ? 'bg-gradient-to-tr from-amber-500 to-orange-600 text-white ring-4 ring-orange-500/20' 
                  : 'bg-slate-800 hover:bg-slate-900 text-slate-100'
              }`}>
                {isSimulationMode ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
              </div>
              <span className={`text-[11px] font-black ${isSimulationMode ? 'text-orange-600 font-extrabold' : 'text-slate-600'}`}>
                {isSimulationMode ? 'テスト停止' : 'テスト走行'}
              </span>
            </button>

            {/* BUTTON 3: Settings */}
            <button 
              onClick={() => {
                initAudio();
                setShowSettings(true);
              }}
              className="flex flex-col items-center gap-1.5 transition active:scale-95 group"
            >
              <div className="w-14 h-14 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center shadow-md transition-all group-hover:shadow-lg">
                <Settings size={24} />
              </div>
              <span className="text-[11px] font-black text-slate-600">設定変更</span>
            </button>
            
          </div>
        </div>
      </main>

      {/* settings modal screen (Point 2 & Point 3 details) */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[3000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <Settings className="text-blue-600" size={24} />
                ハザード設定・カスタマイズ
              </h2>
              <button 
                onClick={() => setShowSettings(false)} 
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Scrollable contents */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[60vh] text-slate-800">
              
              {/* Point 1 Setup: Layer Overlays */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Layers size={14} /> 国のハザードデータ表示
                </h3>
                <div className="flex flex-col gap-2">
                  {NATIONWIDE_LAYERS.map(layer => (
                    <button
                      key={layer.id}
                      onClick={() => toggleNationwideLayer(layer.id)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border-2 text-left font-bold transition-all ${
                        activeNationwideLayers.includes(layer.id)
                          ? 'border-blue-600 bg-blue-50/30 text-blue-600'
                          : 'border-slate-100 hover:bg-slate-50 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-3.5 h-3.5 rounded-full ${layer.color}`} />
                        <span className="text-sm">{layer.label}</span>
                      </div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${activeNationwideLayers.includes(layer.id) ? 'bg-blue-600 text-white' : 'border border-slate-200'}`}>
                        {activeNationwideLayers.includes(layer.id) && <Check size={12} />}
                      </div>
                    </button>
                  ))}
                </div>
                
                {/* Opacity slider */}
                {activeNationwideLayers.length > 0 && (
                  <div className="bg-slate-50 p-4 rounded-2xl space-y-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500">地図重ね合わせの濃さ</span>
                      <span className="text-xs font-extrabold text-blue-600">{Math.round(layerOpacity * 100)}%</span>
                    </div>
                    <input 
                      type="range" min="0.2" max="0.9" step="0.1" value={layerOpacity}
                      onChange={(e) => setLayerOpacity(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                )}
              </div>

              {/* Point 2 Setup: Customizable Alerts Type */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldAlert size={14} /> 通知する危険のジャンル
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'accident', label: '🚦 交通安全', color: 'border-rose-200 hover:bg-rose-50/50', activeColor: 'bg-rose-50 border-rose-500 text-rose-700' },
                    { id: 'flood', label: '🌊 浸水注意', color: 'border-amber-200 hover:bg-amber-50/50', activeColor: 'bg-amber-50 border-amber-500 text-amber-700' },
                    { id: 'landslide', label: '⛰️ 土砂災害', color: 'border-yellow-900/10 hover:bg-yellow-900/5', activeColor: 'bg-yellow-500/10 border-yellow-700 text-yellow-800' }
                  ].map(item => {
                    const isActive = enabledTypes.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleEnabledType(item.id)}
                        className={`p-3 rounded-2xl border-2 text-center text-xs font-extrabold transition-all ${
                          isActive ? item.activeColor : `border-slate-100 text-slate-400`
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Point 2 Setup: Customizable Warn Distance */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Navigation size={14} className="rotate-45" /> 危険に近づいた時の通知距離
                </h3>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { val: 50, label: '50m', desc: '歩行' },
                    { val: 100, label: '100m', desc: '早歩き' },
                    { val: 300, label: '300m', desc: '自転車' },
                    { val: 500, label: '500m', desc: '車' },
                    { val: 1000, label: '1km', desc: '広域' }
                  ].map(preset => (
                    <button
                      key={preset.val}
                      onClick={() => setAlertDistance(preset.val)}
                      className={`py-2 px-1.5 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                        alertDistance === preset.val 
                          ? 'border-blue-600 bg-blue-50 text-blue-600 font-extrabold'
                          : 'border-slate-100 text-slate-400 font-medium hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs">{preset.label}</span>
                      <span className="text-[9px] opacity-75">{preset.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound Select */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Volume2 size={14} /> 警告音の種類
                </h3>
                <div className="flex flex-col gap-2">
                  {DEFAULT_SOUNDS.map((sound) => (
                    <div
                      key={sound.id}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border-2 ${
                        notificationSound === sound.url
                          ? 'border-blue-600 bg-blue-50/20 text-blue-600 font-bold'
                          : 'border-slate-100 text-slate-500'
                      }`}
                    >
                      <button
                        onClick={() => setNotificationSound(sound.url)}
                        className="flex-1 text-left text-sm font-bold h-full"
                      >
                        {sound.label}
                      </button>
                      <button
                        onClick={() => testSound(sound.url)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                      >
                        <Volume2 size={12} /> 試聴
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Base Map selector */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Layers size={14} /> 背景地図のスタイル
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(BASE_MAPS) as Array<keyof typeof BASE_MAPS>).map((key) => (
                    <button
                      key={key}
                      onClick={() => setBaseMap(key)}
                      className={`p-3 rounded-2xl border-2 text-center text-xs font-bold transition-all ${
                        baseMap === key 
                          ? 'border-blue-600 bg-blue-50/30 text-blue-600 font-extrabold shadow-sm' 
                          : 'border-slate-100 text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {BASE_MAPS[key].label.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Map Legend */}
              <div className="pt-3 border-t border-slate-100">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">凡例（マークの説明）</h3>
                <div className="bg-slate-50 p-4 rounded-2xl space-y-3 text-xs text-slate-600 font-bold">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center text-white shadow-sm">⚠️</div>
                    <span>🚦 交通安全注意：過去の事故多発エリア</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center text-white shadow-sm">🌊</div>
                    <span>🌊 浸水注意：雨天時の冠水・低い地帯</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-amber-800 border-2 border-white flex items-center justify-center text-white shadow-sm">⛰️</div>
                    <span>⛰️ 土砂災害注意：急傾斜地・がけ崩れ危険</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-white shadow-sm">🏠</div>
                    <span>🏠 指定緊急避難場所：災害時の避難先</span>
                  </div>
                </div>
              </div>

            </div>
            
            {/* Save Buttons */}
            <div className="p-6 bg-slate-50/50 border-t border-slate-100">
              <button 
                onClick={() => setShowSettings(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-black py-4 rounded-2xl transition shadow-lg shadow-blue-500/25 text-base"
              >
                設定を保存して戻る
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
};

export default HazardMap;
