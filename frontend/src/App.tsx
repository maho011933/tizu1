import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';
import L from 'leaflet';
import { useLocation, AVATAR_OPTIONS } from './context/LocationContext';
import { getMarkerIcon, getHomeIcon, typeLabels, typeColors } from './utils/mapUtils';
import type { Hazard } from './types';

// Leaflet デフォルトアイコン設定
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// 天童市役所（初期位置）
const TENDO_POS: [number, number] = [38.3582, 140.3705];

interface EnhancedHazard extends Hazard {
  level?: number;
  timeOfDay?: string;
  dangerLevel?: number;
  distanceMeters?: number;
  walkTimeMinutes?: number;
  createdAt?: string;
}

// マップ移動ヘルパー
const MapUpdater: React.FC<{ center: [number, number]; zoom?: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom || map.getZoom());
  }, [center, zoom, map]);
  return null;
};

// マップクリックによる座標選択
const MapClickHandler: React.FC<{ onMapClick: (lat: number, lng: number) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
};

function App() {
  const [hazards, setHazards] = useState<EnhancedHazard[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [mapCenter, setMapCenter] = useState<[number, number]>(TENDO_POS);
  const [zoomLevel, setZoomLevel] = useState<number>(15);

  // ヒートマップ表示モード
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);

  // 自宅位置
  const [homePos, setHomePos] = useState<[number, number] | null>(() => {
    const saved = localStorage.getItem('homePos');
    return saved ? JSON.parse(saved) : null;
  });

  // 自分の投稿IDリスト
  const [myHazardIds, setMyHazardIds] = useState<number[]>(() => {
    const saved = localStorage.getItem('myHazardIds');
    return saved ? JSON.parse(saved) : [];
  });

  // フォーム用ステート
  const [selectedPos, setSelectedPos] = useState<[number, number] | null>(null);
  const [formType, setFormType] = useState<string>('Traffic');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formLevel, setFormLevel] = useState<number>(3);
  const [formTimeOfDay, setFormTimeOfDay] = useState<string>('all');
  const [formImage, setFormImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [editingHazard, setEditingHazard] = useState<EnhancedHazard | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  // コメント入力ステート
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});

  // AIあんぜんアドバイス
  const [aiAdviceMap, setAiAdviceMap] = useState<Record<number, { advice: string; loading: boolean }>>({});

  // 避難所 / AED 案内ルート
  const [guideRoute, setGuideRoute] = useState<{ target: EnhancedHazard; polyline: [number, number][] } | null>(null);

  // ユーザーフィードバックモーダル
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackRole, setFeedbackRole] = useState<'child' | 'parent'>('child');
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [parentRating, setParentRating] = useState<string>('とても満足');
  const [parentComment, setParentComment] = useState<string>('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // アバター選択モーダル
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  // トースト通知
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 位置情報コンテキスト
  const {
    userPos,
    heading,
    isMoving,
    avatar,
    setAvatar,
    isSimulating,
    toggleSimulation
  } = useLocation();

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // ハザード一覧取得
  const fetchHazards = useCallback(async () => {
    try {
      const res = await fetch('/api/hazards');
      if (res.ok) {
        const data = await res.json();
        setHazards(data);
      }
    } catch (err) {
      console.error('Failed to fetch hazards:', err);
    }
  }, []);

  useEffect(() => {
    fetchHazards();
  }, [fetchHazards]);

  // SSE 接近通知の購読
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/alerts/stream');
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.hasAlert && payload.alerts && payload.alerts.length > 0) {
            const topAlert = payload.alerts[0];
            showToast(`⚠️ 【ちかくの危険】${topAlert.message}`);
          }
        } catch {
          // ignore
        }
      };
    } catch (err) {
      console.warn('SSE connection error:', err);
    }
    return () => {
      eventSource?.close();
    };
  }, [showToast]);

  // カテゴリ絞り込み
  const filteredHazards = useMemo(() => {
    if (selectedCategory === 'ALL') return hazards;
    return hazards.filter(h => h.type === selectedCategory);
  }, [hazards, selectedCategory]);

  // カテゴリ別件数集計
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: hazards.length };
    hazards.forEach(h => {
      counts[h.type] = (counts[h.type] || 0) + 1;
    });
    return counts;
  }, [hazards]);

  // 自分の投稿かどうか
  const isMyHazard = useCallback((id: number) => {
    return myHazardIds.includes(id);
  }, [myHazardIds]);

  // 自宅を設定
  const setAsHome = (lat: number, lng: number) => {
    const pos: [number, number] = [lat, lng];
    setHomePos(pos);
    localStorage.setItem('homePos', JSON.stringify(pos));
    showToast('🏠 いつものばしょ（自宅）を登録したよ！');
  };

  // マップクリック時の座標選択
  const handleMapClick = (lat: number, lng: number) => {
    setSelectedPos([lat, lng]);
  };

  // 編集開始
  const handleStartEdit = (h: EnhancedHazard) => {
    setEditingHazard(h);
    setSelectedPos([h.lat, h.lng]);
    setFormType(h.type);
    setFormDescription(h.description);
    setFormLevel(h.level || h.dangerLevel || 3);
    setFormTimeOfDay(h.timeOfDay || 'all');
    setImagePreview(h.imageUrl || null);
    setFormImage(null);
  };

  // 編集キャンセル
  const handleCancelEdit = () => {
    setEditingHazard(null);
    setSelectedPos(null);
    setFormDescription('');
    setFormImage(null);
    setImagePreview(null);
    setFormLevel(3);
  };

  // 写真選択
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Gemini AI 自動判定
  const handleAiAutoTag = async () => {
    if (!formDescription.trim()) {
      showToast('💡 先に説明文を入力してね！');
      return;
    }
    setIsAiAnalyzing(true);
    try {
      const res = await fetch('/api/ai/analyze-hazard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: formDescription })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.type) setFormType(data.type);
        if (data.dangerLevel) setFormLevel(data.dangerLevel);
        showToast('✨ AIがカテゴリと危険度を自動判定したよ！');
      } else {
        showToast('⚠️ AIの判定が混み合っています');
      }
    } catch {
      showToast('⚠️ AI接続に失敗しました');
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  // 投稿 / 更新送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPos) {
      alert('ちずを おして ばしょを えらんでね！');
      return;
    }

    const formData = new FormData();
    formData.append('lat', selectedPos[0].toString());
    formData.append('lng', selectedPos[1].toString());
    formData.append('type', formType);
    formData.append('description', formDescription);
    formData.append('level', formLevel.toString());
    formData.append('timeOfDay', formTimeOfDay);
    if (formImage) {
      formData.append('image', formImage);
    }

    try {
      if (editingHazard) {
        // 更新
        const res = await fetch(`/api/hazards/${editingHazard.id}`, {
          method: 'PUT',
          body: formData
        });
        if (res.ok) {
          showToast('✨ 危険情報を更新したよ！');
          handleCancelEdit();
          fetchHazards();
        }
      } else {
        // 新規登録
        const res = await fetch('/api/hazards', {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          const newHazard = await res.json();
          const nextMyIds = [...myHazardIds, newHazard.id];
          setMyHazardIds(nextMyIds);
          localStorage.setItem('myHazardIds', JSON.stringify(nextMyIds));
          showToast('🎉 新しい危険をみんなに知らせたよ！');
          handleCancelEdit();
          fetchHazards();
        }
      }
    } catch (err) {
      console.error('Error saving hazard:', err);
      showToast('⚠️ 保存に失敗しました');
    }
  };

  // 解決済み（削除）
  const handleDeleteHazard = async (id: number) => {
    if (!window.confirm('この危険情報を「かいけつ済み」として削除しますか？')) return;
    try {
      const res = await fetch(`/api/hazards/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('👏 危険がかいけつしたよ！');
        fetchHazards();
      }
    } catch {
      showToast('⚠️ 削除に失敗しました');
    }
  };

  // コメント追加
  const handleAddComment = async (hazardId: number) => {
    const text = commentInputs[hazardId]?.trim();
    if (!text) return;
    try {
      const res = await fetch(`/api/hazards/${hazardId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        const newComment = await res.json();
        setHazards(prev => prev.map(h => {
          if (h.id === hazardId) {
            return {
              ...h,
              comments: [...(h.comments || []), newComment]
            };
          }
          return h;
        }));
        setCommentInputs(prev => ({ ...prev, [hazardId]: '' }));
        showToast('💬 コメントを投稿したよ！');
      }
    } catch {
      showToast('⚠️ コメント投稿に失敗しました');
    }
  };

  // AIあんぜんアドバイス
  const fetchAiAdvice = async (h: EnhancedHazard) => {
    setAiAdviceMap(prev => ({
      ...prev,
      [h.id]: { advice: '', loading: true }
    }));

    try {
      const res = await fetch('/api/ai/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: h.type,
          description: h.description,
          dangerLevel: h.level || h.dangerLevel || 3
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiAdviceMap(prev => ({
          ...prev,
          [h.id]: { advice: data.advice, loading: false }
        }));
      } else {
        setAiAdviceMap(prev => ({
          ...prev,
          [h.id]: { advice: '気をつけて通りましょう。周りをよく見てね！', loading: false }
        }));
      }
    } catch {
      setAiAdviceMap(prev => ({
        ...prev,
        [h.id]: { advice: '気をつけて通りましょう。周りをよく見てね！', loading: false }
      }));
    }
  };

  // 最寄り避難所 / AED 案内
  const handleFindNearby = async (type: 'Shelter' | 'AED') => {
    const center = userPos || mapCenter;
    try {
      const res = await fetch(`/api/hazards/nearby?lat=${center[0]}&lng=${center[1]}&type=${type}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.hazards && data.hazards.length > 0) {
          const nearest = data.hazards[0];
          setGuideRoute({
            target: nearest,
            polyline: [center, [nearest.lat, nearest.lng]]
          });
          setMapCenter([nearest.lat, nearest.lng]);
          setZoomLevel(16);
          showToast(`📍 一番ちかい【${type === 'Shelter' ? 'ひなんじょ' : 'AED'}】まで約${nearest.distanceMeters}m (歩いて${nearest.walkTimeMinutes}分) です！`);
        } else {
          showToast(`近くに${type === 'Shelter' ? 'ひなんじょ' : 'AED'}が見つかりませんでした`);
        }
      }
    } catch {
      showToast('⚠️ 検索に失敗しました');
    }
  };

  // フィードバック送信
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingFeedback(true);
    const payload = {
      role: feedbackRole,
      rating: feedbackRole === 'child' ? feedbackRating : parentRating,
      comment: feedbackRole === 'child' ? feedbackText : parentComment
    };

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('💌 ご意見を送ってくれてありがとう！✨');
        setIsFeedbackOpen(false);
        setFeedbackText('');
        setParentComment('');
      }
    } catch {
      showToast('⚠️ 送信に失敗しました');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // 現在地アイコン生成
  const currentLocationIcon = useMemo(() => {
    const currentAvatar = AVATAR_OPTIONS.find(a => a.id === avatar) || AVATAR_OPTIONS[0];
    const rotateStyle = heading !== null ? `transform: rotate(${heading}deg);` : '';
    const movingClass = isMoving ? 'walking-animation' : '';

    return L.divIcon({
      className: 'current-user-icon',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
          <div style="position: absolute; top: -18px; background: ${currentAvatar.color}; color: white; font-size: 10px; font-weight: bold; padding: 1px 6px; border-radius: 10px; border: 2px solid white; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
            いまここ
          </div>
          <div class="${movingClass}" style="background: white; border: 3px solid ${currentAvatar.color}; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.35); ${rotateStyle}">
            ${currentAvatar.emoji}
          </div>
        </div>
      `,
      iconSize: [38, 48],
      iconAnchor: [19, 48]
    });
  }, [avatar, heading, isMoving]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', fontFamily: '"Nunito", "M PLUS Rounded 1c", sans-serif' }}>
      
      {/* 🌟 ヘッダー */}
      <header style={{
        backgroundColor: '#FF6B6B',
        color: 'white',
        padding: '0.6rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)',
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.8rem' }}>🗺️</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, letterSpacing: '0.05em' }}>
              みんなの あんぜんマップ
            </h1>
            <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>こどもと まちの あんぜんを まもる</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* 🔥 ヒートマップ切り替えボタン */}
          <button
            onClick={() => {
              setShowHeatmap(prev => !prev);
              showToast(showHeatmap ? 'ヒートマップをOFFにしました' : '🔥 あぶないエリアのヒートマップを表示中！');
            }}
            style={{
              background: showHeatmap ? '#E74C3C' : 'white',
              color: showHeatmap ? 'white' : '#C0392B',
              border: showHeatmap ? 'none' : '2px solid #E74C3C',
              borderRadius: '20px',
              padding: '0.4rem 0.8rem',
              fontWeight: 900,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              transition: 'all 0.2s ease'
            }}
          >
            <span>🔥</span>
            <span>{showHeatmap ? 'ヒートマップON' : 'ヒートマップOFF'}</span>
          </button>

          <button
            onClick={() => setIsAvatarModalOpen(true)}
            style={{
              background: 'white',
              border: 'none',
              borderRadius: '20px',
              padding: '0.4rem 0.8rem',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <span>{AVATAR_OPTIONS.find(a => a.id === avatar)?.emoji || '👦'}</span>
            <span>アバター</span>
          </button>

          <button
            onClick={toggleSimulation}
            style={{
              background: isSimulating ? '#2ECC71' : '#FFF3E0',
              color: isSimulating ? 'white' : '#E67E22',
              border: 'none',
              borderRadius: '20px',
              padding: '0.4rem 0.8rem',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
            }}
          >
            {isSimulating ? '🚶 おさんぽ中' : '🚶 おさんぽ体験'}
          </button>

          <button
            onClick={() => handleFindNearby('Shelter')}
            style={{
              background: '#2ECC71',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              padding: '0.4rem 0.8rem',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
            }}
          >
            🏫 ひなんじょ
          </button>

          <button
            onClick={() => handleFindNearby('AED')}
            style={{
              background: '#E67E22',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              padding: '0.4rem 0.8rem',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
            }}
          >
            💓 AED
          </button>

          <button
            onClick={() => setIsFeedbackOpen(true)}
            style={{
              background: '#3498DB',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              padding: '0.4rem 0.8rem',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
            }}
          >
            💌 ご意見
          </button>
        </div>
      </header>

      {/* 🏷️ カテゴリ絞り込みフィルターバー */}
      <div style={{
        background: '#FFF9E6',
        padding: '0.5rem 1rem',
        display: 'flex',
        gap: '0.5rem',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        borderBottom: '2px solid #FFE082',
        zIndex: 900
      }}>
        <button
          onClick={() => setSelectedCategory('ALL')}
          style={{
            padding: '0.35rem 0.8rem',
            borderRadius: '20px',
            border: 'none',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            cursor: 'pointer',
            backgroundColor: selectedCategory === 'ALL' ? '#FF6B6B' : 'white',
            color: selectedCategory === 'ALL' ? 'white' : '#555',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          ぜんぶ ({categoryCounts.ALL || 0})
        </button>

        {Object.entries(typeLabels).map(([typeKey, label]) => {
          const count = categoryCounts[typeKey] || 0;
          const isSelected = selectedCategory === typeKey;
          const col = typeColors[typeKey] || { bg: '#9B59B6', text: 'white' };
          return (
            <button
              key={typeKey}
              onClick={() => setSelectedCategory(typeKey)}
              style={{
                padding: '0.35rem 0.8rem',
                borderRadius: '20px',
                border: 'none',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                cursor: 'pointer',
                backgroundColor: isSelected ? col.bg : 'white',
                color: isSelected ? col.text : '#444',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* 📦 メインコンテンツ（2カラム：サイドバー＆マップ） */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* 📋 左側サイドバー（投稿フォーム ＆ リスト） */}
        <aside style={{
          width: '360px',
          minWidth: '320px',
          maxWidth: '420px',
          backgroundColor: '#F8F9FA',
          borderRight: '2px solid #E9ECEF',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          padding: '1rem',
          boxSizing: 'border-box'
        }}>
          
          {/* 📝 投稿フォーム */}
          <div style={{
            backgroundColor: 'white',
            padding: '1rem',
            borderRadius: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            marginBottom: '1.2rem'
          }}>
            <h2 style={{ margin: '0 0 0.8rem 0', fontSize: '1.1rem', color: '#FF6B6B', fontWeight: 900 }}>
              {editingHazard ? 'ほうこくを なおす' : 'あぶないよ！をおしえる'}
            </h2>

            <form onSubmit={handleSubmit}>
              {/* カテゴリ選択 */}
              <div style={{ marginBottom: '0.8rem' }}>
                <label htmlFor="hazard-type" style={{ display: 'block', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '0.3rem', color: '#2C3E50' }}>
                  なにが あぶない？
                </label>
                <select
                  id="hazard-type"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #CCC', fontSize: '0.85rem' }}
                >
                  <option value="Traffic">くるま・こうつう 🚗</option>
                  <option value="Crime">ぼうはん・ふしんしゃ 👮</option>
                  <option value="Disaster">じしん・かじ 🌊</option>
                  <option value="Lighting">くらみち・でんき 🌙</option>
                  <option value="Shelter">ひなんじょ 🏫</option>
                  <option value="AED">AED・きゅうきゅう 💓</option>
                  <option value="Other">そのほか 🐾</option>
                </select>
              </div>

              {/* 説明文 */}
              <div style={{ marginBottom: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <label htmlFor="hazard-desc" style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#2C3E50' }}>
                    どこが あぶない？
                  </label>
                  <button
                    type="button"
                    onClick={handleAiAutoTag}
                    disabled={isAiAnalyzing}
                    style={{
                      background: '#9B59B6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    {isAiAnalyzing ? 'AI判定中...' : '✨ AI判定'}
                  </button>
                </div>
                <textarea
                  id="hazard-desc"
                  required
                  rows={2}
                  placeholder="れい：みちが くらい、くるまが おおい"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #CCC', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              {/* 危険度 Lv (1〜5) */}
              <div style={{ marginBottom: '0.8rem' }}>
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '0.3rem', color: '#2C3E50' }}>
                  あぶなさ (危険度): <span style={{ color: formLevel >= 4 ? '#E74C3C' : '#F39C12', fontWeight: 900 }}>Lv.{formLevel}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formLevel}
                  onChange={(e) => setFormLevel(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#7F8C8D' }}>
                  <span>Lv.1 (すこし注意)</span>
                  <span>Lv.3 (ふつう)</span>
                  <span>Lv.5 (とても危険！)</span>
                </div>
              </div>

              {/* 写真選択 */}
              <div style={{ marginBottom: '0.8rem' }}>
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '0.3rem', color: '#2C3E50' }}>
                  しゃしん
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ fontSize: '0.8rem', width: '100%' }}
                />
                {imagePreview && (
                  <div style={{ marginTop: '0.3rem' }}>
                    <img src={imagePreview} alt="プレビュー" style={{ maxHeight: '70px', borderRadius: '6px' }} />
                  </div>
                )}
              </div>

              {/* 座標選択ガイド */}
              <div style={{ marginBottom: '0.8rem', fontSize: '0.8rem', color: selectedPos ? '#2ECC71' : '#E67E22', fontWeight: 'bold' }}>
                {selectedPos ? `📍 ばしょ選択済み (${selectedPos[0].toFixed(4)}, ${selectedPos[1].toFixed(4)})` : '👉 ちずを おして ばしょを えらんでね！'}
              </div>

              {/* 送信・キャンセルボタン */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {editingHazard && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    style={{ flex: 1, padding: '0.5rem', borderRadius: '15px', border: 'none', background: '#ECEFF1', color: '#546E7A', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    やめる
                  </button>
                )}
                <button
                  type="submit"
                  style={{
                    flex: 2,
                    padding: '0.5rem',
                    borderRadius: '15px',
                    border: 'none',
                    background: editingHazard ? '#F39C12' : '#FF6B6B',
                    color: 'white',
                    fontWeight: 900,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    boxShadow: '0 3px 6px rgba(0,0,0,0.15)'
                  }}
                >
                  {editingHazard ? 'なおす！' : 'ほうこくする！'}
                </button>
              </div>
            </form>
          </div>

          {/* 📋 危険箇所一覧リスト */}
          <div>
            <h3 style={{ margin: '0 0 0.6rem 0', fontSize: '1rem', color: '#2C3E50', fontWeight: 900 }}>
              危険箇所一覧 ({filteredHazards.length}件)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {filteredHazards.map(h => {
                const isMine = isMyHazard(h.id);
                const col = typeColors[h.type] || typeColors.Other;
                const level = h.level || h.dangerLevel || 3;
                return (
                  <div
                    key={h.id}
                    id={`hazard-${h.id}`}
                    style={{
                      backgroundColor: 'white',
                      padding: '0.8rem',
                      borderRadius: '12px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                      borderLeft: `5px solid ${col.bg}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: col.bg }}>
                        {typeLabels[h.type] || h.type}
                      </span>
                      <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                        <span style={{ background: level >= 4 ? '#E74C3C' : '#F39C12', color: 'white', padding: '1px 5px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                          Lv.{level}
                        </span>
                        {isMine && (
                          <span style={{ background: '#F1C40F', color: '#2C3E50', padding: '1px 5px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                            じぶん
                          </span>
                        )}
                      </div>
                    </div>

                    <p style={{ margin: '0.3rem 0', fontSize: '0.85rem', color: '#333' }}>
                      {h.description}
                    </p>

                    {h.imageUrl && (
                      <img
                        src={h.imageUrl}
                        alt="写真"
                        style={{ width: '100%', maxHeight: '100px', objectFit: 'cover', borderRadius: '6px', margin: '0.3rem 0' }}
                      />
                    )}

                    {/* コメント一覧 */}
                    {h.comments && h.comments.length > 0 && (
                      <div style={{ marginTop: '0.4rem', borderTop: '1px dotted #EEE', paddingTop: '0.3rem', fontSize: '0.75rem', color: '#555' }}>
                        {h.comments.map(c => (
                          <div key={c.id}>
                            💬 <span>{c.text}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* コメント入力 */}
                    <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.4rem' }}>
                      <input
                        type="text"
                        placeholder="ありがとう！など..."
                        value={commentInputs[h.id] || ''}
                        onChange={(e) => setCommentInputs(prev => ({ ...prev, [h.id]: e.target.value }))}
                        style={{ flex: 1, padding: '0.3rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #DDD' }}
                      />
                      <button
                        onClick={() => handleAddComment(h.id)}
                        style={{ padding: '0.3rem 0.5rem', background: '#3498DB', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        おく
                      </button>
                    </div>

                    {/* 自分の投稿用のボタン */}
                    {isMine && (
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                        <button
                          onClick={() => handleStartEdit(h)}
                          style={{ flex: 1, padding: '0.3rem', background: '#F39C12', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          なおす📝
                        </button>
                        <button
                          onClick={() => handleDeleteHazard(h.id)}
                          style={{ flex: 1, padding: '0.3rem', background: '#E74C3C', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          かいけつ✨
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* 🗺️ 右側マップエリア */}
        <div style={{ flex: 1, position: 'relative' }}>
          <MapContainer
            center={TENDO_POS}
            zoom={zoomLevel}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapUpdater center={mapCenter} zoom={zoomLevel} />
            <MapClickHandler onMapClick={handleMapClick} />

            {/* 🔥 ヒートマップレイヤー (グラデーションサーマルサークル) */}
            {showHeatmap && filteredHazards.map(h => {
              const level = h.level || h.dangerLevel || 3;
              if (level >= 5) {
                return (
                  <React.Fragment key={`heat-${h.id}`}>
                    <Circle center={[h.lat, h.lng]} radius={85} pathOptions={{ stroke: false, fillColor: '#FF0000', fillOpacity: 0.15 }} />
                    <Circle center={[h.lat, h.lng]} radius={48} pathOptions={{ stroke: false, fillColor: '#E74C3C', fillOpacity: 0.35 }} />
                    <Circle center={[h.lat, h.lng]} radius={22} pathOptions={{ stroke: false, fillColor: '#C0392B', fillOpacity: 0.6 }} />
                  </React.Fragment>
                );
              } else if (level >= 4) {
                return (
                  <React.Fragment key={`heat-${h.id}`}>
                    <Circle center={[h.lat, h.lng]} radius={60} pathOptions={{ stroke: false, fillColor: '#FF5722', fillOpacity: 0.18 }} />
                    <Circle center={[h.lat, h.lng]} radius={32} pathOptions={{ stroke: false, fillColor: '#E67E22', fillOpacity: 0.4 }} />
                  </React.Fragment>
                );
              } else if (level === 3) {
                return (
                  <Circle key={`heat-${h.id}`} center={[h.lat, h.lng]} radius={40} pathOptions={{ stroke: false, fillColor: '#F1C40F', fillOpacity: 0.25 }} />
                );
              } else {
                return (
                  <Circle key={`heat-${h.id}`} center={[h.lat, h.lng]} radius={25} pathOptions={{ stroke: false, fillColor: '#F39C12', fillOpacity: 0.15 }} />
                );
              }
            })}

            {/* クリック選択位置のピン */}
            {selectedPos && (
              <Marker
                position={selectedPos}
                icon={L.divIcon({
                  className: 'selected-pos-icon',
                  html: '<div style="font-size: 26px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">📍</div>',
                  iconSize: [26, 26],
                  iconAnchor: [13, 26]
                })}
              />
            )}

            {/* 現在地ピン */}
            {userPos && (
              <Marker position={userPos} icon={currentLocationIcon}>
                <Popup>
                  <div style={{ textAlign: 'center' }}>
                    <strong>📍 いまいるばしょ</strong>
                    <br />
                    <button
                      onClick={() => setAsHome(userPos[0], userPos[1])}
                      style={{
                        marginTop: '0.4rem',
                        padding: '0.3rem 0.6rem',
                        background: '#2C3E50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      🏠 ここを「いつものばしょ」にする
                    </button>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* 自宅ピン */}
            {homePos && (
              <Marker position={homePos} icon={getHomeIcon()}>
                <Popup>
                  <div style={{ textAlign: 'center' }}>
                    <strong>🏠 いつものばしょ（じたく）</strong>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* 案内ルート線 */}
            {guideRoute && (
              <Polyline
                positions={guideRoute.polyline}
                pathOptions={{ color: '#E74C3C', weight: 4, dashArray: '8, 8' }}
              />
            )}

            {/* ハザードマーカー一覧（危険度Lvに応じた動的サイズピン） */}
            {filteredHazards.map(h => {
              const isMine = isMyHazard(h.id);
              const level = h.level || h.dangerLevel || 3;
              const marker = getMarkerIcon(h.type, isMine, level);
              const adviceState = aiAdviceMap[h.id];

              return (
                <Marker key={h.id} position={[h.lat, h.lng]} icon={marker}>
                  <Popup>
                    <div style={{ minWidth: '220px', maxWidth: '300px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <span style={{
                          backgroundColor: (typeColors[h.type] || typeColors.Other).bg,
                          color: (typeColors[h.type] || typeColors.Other).text,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: 'bold'
                        }}>
                          {typeLabels[h.type] || h.type}
                        </span>
                        <span style={{
                          backgroundColor: level >= 4 ? '#E74C3C' : '#F39C12',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold'
                        }}>
                          きけん度 Lv.{level}
                        </span>
                      </div>

                      <p style={{ margin: '0.4rem 0', fontSize: '0.95rem', color: '#2C3E50', lineHeight: 1.4 }}>
                        {h.description}
                      </p>

                      {h.imageUrl && (
                        <div style={{ margin: '0.4rem 0' }}>
                          <img
                            src={h.imageUrl}
                            alt="危険箇所の写真"
                            style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', borderRadius: '8px' }}
                          />
                        </div>
                      )}

                      {/* AIあんぜんアドバイス */}
                      <div style={{ marginTop: '0.6rem', borderTop: '1px dashed #E0E0E0', paddingTop: '0.4rem' }}>
                        {adviceState?.advice ? (
                          <div style={{ background: '#E8F8F5', padding: '0.5rem', borderRadius: '8px', fontSize: '0.85rem', color: '#16A085' }}>
                            <strong>🤖 AIあんぜんアドバイス:</strong>
                            <p style={{ margin: '0.2rem 0 0 0' }}>{adviceState.advice}</p>
                          </div>
                        ) : (
                          <button
                            onClick={() => fetchAiAdvice(h)}
                            disabled={adviceState?.loading}
                            style={{
                              width: '100%',
                              padding: '0.3rem',
                              background: '#1ABC9C',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '0.8rem',
                              fontWeight: 'bold',
                              cursor: 'pointer'
                            }}
                          >
                            {adviceState?.loading ? '✨ AIがアドバイス考え中...' : '🤖 AIあんぜんアドバイスを聞く'}
                          </button>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* 🔥 ヒートマップ凡例 (Legend) */}
          {showHeatmap && (
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '20px',
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(4px)',
              padding: '0.6rem 0.9rem',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 1000,
              fontSize: '0.8rem',
              color: '#2C3E50',
              border: '1px solid #FFE082'
            }}>
              <div style={{ fontWeight: 900, marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span>🔥</span>
                <span>あぶないエリア (ヒートマップ)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#E74C3C', display: 'inline-block' }}></span>
                  <span>たいへん危険 (Lv.4〜5)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#F1C40F', display: 'inline-block' }}></span>
                  <span>ちゅうい (Lv.3)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#F39C12', display: 'inline-block', opacity: 0.6 }}></span>
                  <span>すこし注意 (Lv.1〜2)</span>
                </div>
              </div>
            </div>
          )}

          {/* クイック操作ボタン */}
          <div style={{ position: 'absolute', bottom: '20px', right: '20px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 1000 }}>
            {userPos && (
              <button
                onClick={() => { setMapCenter(userPos); setZoomLevel(16); }}
                title="いまのばしょに移動"
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'white',
                  border: '2px solid #3498DB',
                  fontSize: '1.3rem',
                  cursor: 'pointer',
                  boxShadow: '0 3px 8px rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                📍
              </button>
            )}

            {homePos && (
              <button
                onClick={() => { setMapCenter(homePos); setZoomLevel(16); }}
                title="いつものばしょ（自宅）に移動"
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'white',
                  border: '2px solid #2C3E50',
                  fontSize: '1.3rem',
                  cursor: 'pointer',
                  boxShadow: '0 3px 8px rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                🏠
              </button>
            )}

            <button
              onClick={() => { setMapCenter(TENDO_POS); setZoomLevel(15); }}
              title="天童市役所に移動"
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'white',
                border: '2px solid #FF6B6B',
                fontSize: '1.3rem',
                cursor: 'pointer',
                boxShadow: '0 3px 8px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              🌸
            </button>
          </div>
        </div>
      </div>

      {/* 🎭 アバター選択モーダル */}
      {isAvatarModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '1rem'
        }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '1.5rem', width: '100%', maxWidth: '380px' }}>
            <h3 style={{ margin: '0 0 1rem 0', textAlign: 'center', color: '#2C3E50' }}>
              👤 おすきなアバターをえらんでね！
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem' }}>
              {AVATAR_OPTIONS.map(a => (
                <button
                  key={a.id}
                  onClick={() => { setAvatar(a.id); setIsAvatarModalOpen(false); showToast(`アバターを【${a.label}】にしたよ！`); }}
                  style={{
                    padding: '0.8rem 0.4rem',
                    borderRadius: '12px',
                    border: avatar === a.id ? `3px solid ${a.color}` : '1px solid #DDD',
                    background: avatar === a.id ? '#F0F9FF' : 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontSize: '2rem' }}>{a.emoji}</span>
                  <span style={{ fontSize: '0.8rem', marginTop: '0.3rem', fontWeight: 'bold' }}>{a.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsAvatarModalOpen(false)}
              style={{ width: '100%', marginTop: '1rem', padding: '0.6rem', borderRadius: '20px', border: 'none', background: '#ECEFF1', color: '#546E7A', fontWeight: 'bold', cursor: 'pointer' }}
            >
              とじる
            </button>
          </div>
        </div>
      )}

      {/* 💌 フィードバックモーダル */}
      {isFeedbackOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '1rem'
        }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '1.5rem', width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 0.8rem 0', textAlign: 'center', color: '#3498DB' }}>
              💌 アプリのご意見・ご感想
            </h3>

            <div style={{ display: 'flex', background: '#F0F3F4', borderRadius: '20px', padding: '3px', marginBottom: '1rem' }}>
              <button
                type="button"
                onClick={() => setFeedbackRole('child')}
                style={{
                  flex: 1,
                  padding: '0.4rem',
                  borderRadius: '18px',
                  border: 'none',
                  background: feedbackRole === 'child' ? '#FF6B6B' : 'transparent',
                  color: feedbackRole === 'child' ? 'white' : '#555',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                👦 こども用
              </button>
              <button
                type="button"
                onClick={() => setFeedbackRole('parent')}
                style={{
                  flex: 1,
                  padding: '0.4rem',
                  borderRadius: '18px',
                  border: 'none',
                  background: feedbackRole === 'parent' ? '#3498DB' : 'transparent',
                  color: feedbackRole === 'parent' ? 'white' : '#555',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                👨‍👩‍👧 おとな・ほごしゃ用
              </button>
            </div>

            <form onSubmit={handleSubmitFeedback}>
              {feedbackRole === 'child' ? (
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.4rem', color: '#2C3E50' }}>
                    このアプリは たのしい？
                  </label>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', margin: '0.8rem 0', fontSize: '1.8rem' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <span
                        key={star}
                        onClick={() => setFeedbackRating(star)}
                        style={{ cursor: 'pointer', filter: star <= feedbackRating ? 'none' : 'grayscale(100%) opacity(40%)' }}
                      >
                        ⭐
                      </span>
                    ))}
                  </div>
                  <textarea
                    rows={3}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="例: ピンが かわいくて たのしかった！"
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', border: '1px solid #CCC', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.4rem', color: '#2C3E50' }}>
                    全体の使いやすさ・満足度
                  </label>
                  <select
                    value={parentRating}
                    onChange={(e) => setParentRating(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', border: '1px solid #CCC', marginBottom: '0.8rem' }}
                  >
                    <option value="とても満足">とても満足（子供だけでも直感的に使えた）</option>
                    <option value="満足">満足（デザインがわかりやすい）</option>
                    <option value="ふつう">ふつう</option>
                    <option value="改善が必要">改善が必要</option>
                  </select>
                  <textarea
                    rows={3}
                    value={parentComment}
                    onChange={(e) => setParentComment(e.target.value)}
                    placeholder="ご意見・改善要望・気づいた点をご自由にご記入ください"
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', border: '1px solid #CCC', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.2rem' }}>
                <button
                  type="button"
                  onClick={() => setIsFeedbackOpen(false)}
                  style={{ flex: 1, padding: '0.6rem', borderRadius: '20px', border: 'none', background: '#ECEFF1', color: '#546E7A', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  やめる
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFeedback}
                  style={{ flex: 2, padding: '0.6rem', borderRadius: '20px', border: 'none', background: feedbackRole === 'child' ? '#FF6B6B' : '#3498DB', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {isSubmittingFeedback ? '送信中...' : '💌 送信する！'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔔 トースト通知 */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#2C3E50',
          color: 'white',
          padding: '0.8rem 1.4rem',
          borderRadius: '30px',
          boxShadow: '0 6px 16px rgba(0,0,0,0.3)',
          fontWeight: 'bold',
          fontSize: '0.95rem',
          zIndex: 3000,
          animation: 'fade-in 0.3s ease-out'
        }}>
          {toastMessage}
        </div>
      )}

    </div>
  );
}

export default App;
