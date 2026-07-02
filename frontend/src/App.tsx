import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
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

function App() {
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

      fetch(`http://localhost:3001/api/hazards/${editingHazardId}`, {
        method: 'PUT',
        body: formData
      })
        .then(res => res.json())
        .then(updatedHazard => {
          setHazards(hazards.map(h => h.id === editingHazardId ? updatedHazard : h));
          handleCancelEdit();
          if (isMobile) setActiveTab('list');
        });
    } else {
      // Create new
      formData.append('lat', newHazardPos.lat.toString());
      formData.append('lng', newHazardPos.lng.toString());
      fetch('http://localhost:3001/api/hazards', {
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
    </div>
  );
}

export default App;
