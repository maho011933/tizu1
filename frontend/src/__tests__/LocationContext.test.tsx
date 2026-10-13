import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  LocationProvider,
  useLocation,
  calculateHeading,
  AVATAR_OPTIONS,
} from '../context/LocationContext';

describe('LocationContext (位置情報・アバター管理・追跡機能)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ==========================================
  // 1. calculateHeading (方位角計算ロジック)
  // ==========================================
  describe('calculateHeading - 大円距離に基づく方位角計算', () => {
    it('同一点の場合は 0 度を返すこと', () => {
      expect(calculateHeading(35.6812, 139.7671, 35.6812, 139.7671)).toBe(0);
    });

    it('真北（北向き）への移動時に 0度近傍を返すこと', () => {
      const heading = calculateHeading(35.0, 139.0, 35.1, 139.0);
      expect(heading).toBeCloseTo(0, 0);
    });

    it('真東（東向き）への移動時に 90度近傍を返すこと', () => {
      const heading = calculateHeading(35.0, 139.0, 35.0, 139.1);
      expect(heading).toBeCloseTo(90, 0);
    });

    it('真南（南向き）への移動時に 180度近傍を返すこと', () => {
      const heading = calculateHeading(35.1, 139.0, 35.0, 139.0);
      expect(heading).toBeCloseTo(180, 0);
    });

    it('真西（西向き）への移動時に 270度近傍を返すこと', () => {
      const heading = calculateHeading(35.0, 139.1, 35.0, 139.0);
      expect(heading).toBeCloseTo(270, 0);
    });
  });

  // ==========================================
  // 2. AVATAR_OPTIONS 定義の検証
  // ==========================================
  describe('AVATAR_OPTIONS - アバタープリセット定義', () => {
    it('7種類のアバター（boy, girl, bike, car, cat, dog, robot）が定義されていること', () => {
      const expectedIds = ['boy', 'girl', 'bike', 'car', 'cat', 'dog', 'robot'];
      const actualIds = AVATAR_OPTIONS.map((a) => a.id);
      expect(actualIds).toEqual(expectedIds);
    });

    it('全アバターに絵文字、ひらがな/カタカナラベル、カラー、タイプが設定されていること', () => {
      AVATAR_OPTIONS.forEach((avatar) => {
        expect(avatar.id).toBeTruthy();
        expect(avatar.emoji).toBeTruthy();
        expect(avatar.label).toBeTruthy();
        expect(avatar.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(['walk', 'vehicle', 'pet']).toContain(avatar.type);
      });
    });
  });

  // ==========================================
  // 3. Provider外での useLocation フォールバック
  // ==========================================
  describe('useLocation - Provider外での安全なフォールバック', () => {
    it('LocationProvider外で呼び出された場合でもクラッシュせず初期フォールバック値を返すこと', () => {
      const { result } = renderHook(() => useLocation());

      expect(result.current.userPos).toBeNull();
      expect(result.current.accuracy).toBeNull();
      expect(result.current.heading).toBeNull();
      expect(result.current.isMoving).toBe(false);
      expect(result.current.isTracking).toBe(false);
      expect(result.current.locationHistory).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.avatar).toBe('boy');
      expect(result.current.isSimulating).toBe(false);

      // コールバック関数を実行しても例外が発生しないこと
      expect(() => {
        result.current.setAvatar('girl');
        result.current.toggleSimulation();
        result.current.startTracking();
        result.current.stopTracking();
        result.current.clearHistory();
      }).not.toThrow();
    });
  });

  // ==========================================
  // 4. アバターの選択と localStorage 永続化
  // ==========================================
  describe('Avatar Selection & Persistence', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <LocationProvider>{children}</LocationProvider>
    );

    it('localStorage に保存がない場合、デフォルトで boy が選択されること', () => {
      const { result } = renderHook(() => useLocation(), { wrapper });
      expect(result.current.avatar).toBe('boy');
    });

    it('localStorage に有効なアバターID（cat）がある場合、初期値として復元されること', () => {
      localStorage.setItem('user_avatar', 'cat');
      const { result } = renderHook(() => useLocation(), { wrapper });
      expect(result.current.avatar).toBe('cat');
    });

    it('localStorage に不正なアバターIDがある場合、安全に boy にフォールバックすること', () => {
      localStorage.setItem('user_avatar', 'unknown_avatar_123');
      const { result } = renderHook(() => useLocation(), { wrapper });
      expect(result.current.avatar).toBe('boy');
    });

    it('setAvatar でアバターを変更でき、localStorage にも保存されること', () => {
      const { result } = renderHook(() => useLocation(), { wrapper });

      act(() => {
        result.current.setAvatar('girl');
      });

      expect(result.current.avatar).toBe('girl');
      expect(localStorage.getItem('user_avatar')).toBe('girl');
    });

    it('localStorage へのアクセスが失敗しても例外を投げずクラッシュしないこと', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const { result } = renderHook(() => useLocation(), { wrapper });

      expect(() => {
        act(() => {
          result.current.setAvatar('robot');
        });
      }).not.toThrow();

      expect(result.current.avatar).toBe('robot');
      setItemSpy.mockRestore();
    });
  });

  // ==========================================
  // 5. 位置情報トラッキングと Geolocation モック
  // ==========================================
  describe('Geolocation Tracking & Updates', () => {
    let watchSuccessCallback: ((pos: GeolocationPosition) => void) | null = null;
    const mockWatchPosition = vi.fn();
    const mockClearWatch = vi.fn();

    beforeEach(() => {
      watchSuccessCallback = null;
      mockWatchPosition.mockReset();
      mockClearWatch.mockReset();

      mockWatchPosition.mockImplementation((success) => {
        watchSuccessCallback = success;
        return 999;
      });

      Object.defineProperty(globalThis.navigator, 'geolocation', {
        value: {
          watchPosition: mockWatchPosition,
          clearWatch: mockClearWatch,
        },
        writable: true,
        configurable: true,
      });
    });

    function createMockPosition(
      latitude: number,
      longitude: number,
      options: { accuracy?: number; heading?: number | null; speed?: number | null; timestamp?: number } = {}
    ): GeolocationPosition {
      return {
        coords: {
          latitude,
          longitude,
          accuracy: options.accuracy ?? 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: options.heading ?? null,
          speed: options.speed ?? null,
          toJSON: () => ({}),
        },
        timestamp: options.timestamp ?? 1600000000000,
        toJSON: () => ({}),
      };
    }

    const wrapper = ({ children }: { children: ReactNode }) => (
      <LocationProvider>{children}</LocationProvider>
    );

    it('マウント時に isTracking が true であれば watchPosition を自動起動すること', () => {
      renderHook(() => useLocation(), { wrapper });
      expect(mockWatchPosition).toHaveBeenCalledTimes(1);
    });

    it('位置情報を受信した際、userPos / accuracy / locationHistory が正常に更新されること', () => {
      const { result } = renderHook(() => useLocation(), { wrapper });

      expect(watchSuccessCallback).toBeTruthy();

      const fakePosition = createMockPosition(35.6812, 139.7671, { accuracy: 10 });

      act(() => {
        watchSuccessCallback!(fakePosition);
      });

      expect(result.current.userPos).toEqual([35.6812, 139.7671]);
      expect(result.current.accuracy).toBe(10);
      expect(result.current.locationHistory.length).toBe(1);
      expect(result.current.locationHistory[0].lat).toBe(35.6812);
      expect(result.current.error).toBeNull();
    });

    it('1.5m以上移動した場合は isMoving が true となり方位角が更新されること', () => {
      const { result } = renderHook(() => useLocation(), { wrapper });

      // 初回位置
      act(() => {
        watchSuccessCallback!(createMockPosition(35.6812, 139.7671, { accuracy: 5, heading: 45, speed: 1.5 }));
      });

      expect(result.current.isMoving).toBe(false);

      // 約55メートル北へ移動 (1.5m以上)
      act(() => {
        watchSuccessCallback!(createMockPosition(35.6817, 139.7671, { accuracy: 5, heading: 0, speed: 2.0 }));
      });

      expect(result.current.isMoving).toBe(true);
      expect(result.current.heading).toBe(0);
      expect(result.current.locationHistory.length).toBe(2);
    });

    it('clearHistory で移動履歴を全消去できること', () => {
      const { result } = renderHook(() => useLocation(), { wrapper });

      act(() => {
        watchSuccessCallback!(createMockPosition(35.6812, 139.7671, { accuracy: 10 }));
      });

      expect(result.current.locationHistory.length).toBe(1);

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.locationHistory).toEqual([]);
    });

    it('stopTracking で clearWatch が呼び出され isTracking が false になること', () => {
      const { result } = renderHook(() => useLocation(), { wrapper });

      act(() => {
        result.current.stopTracking();
      });

      expect(mockClearWatch).toHaveBeenCalledWith(999);
      expect(result.current.isTracking).toBe(false);
    });

    it('アンマウント時に clearWatch が安全に呼び出されること', () => {
      const { unmount } = renderHook(() => useLocation(), { wrapper });
      expect(mockWatchPosition).toHaveBeenCalledTimes(1);

      unmount();
      expect(mockClearWatch).toHaveBeenCalledWith(999);
    });
  });

  // ==========================================
  // 6. エラーハンドリング
  // ==========================================
  describe('Geolocation Error Handling', () => {
    let watchErrorCallback: ((err: GeolocationPositionError) => void) | null = null;
    const mockWatchPosition = vi.fn();
    const mockClearWatch = vi.fn();

    beforeEach(() => {
      watchErrorCallback = null;
      mockWatchPosition.mockImplementation((_success, error) => {
        watchErrorCallback = error;
        return 123;
      });

      Object.defineProperty(globalThis.navigator, 'geolocation', {
        value: {
          watchPosition: mockWatchPosition,
          clearWatch: mockClearWatch,
        },
        writable: true,
        configurable: true,
      });
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <LocationProvider>{children}</LocationProvider>
    );

    it('PERMISSION_DENIED の場合に「位置情報の使用が許可されていません」と表示されること', () => {
      const { result } = renderHook(() => useLocation(), { wrapper });

      act(() => {
        watchErrorCallback!({
          code: 1, // PERMISSION_DENIED
          message: 'User denied geolocation',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        });
      });

      expect(result.current.error).toBe('位置情報の使用が許可されていません');
    });

    it('POSITION_UNAVAILABLE の場合に「位置情報が利用できません」と表示されること', () => {
      const { result } = renderHook(() => useLocation(), { wrapper });

      act(() => {
        watchErrorCallback!({
          code: 2, // POSITION_UNAVAILABLE
          message: 'Position unavailable',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        });
      });

      expect(result.current.error).toBe('位置情報が利用できません');
    });

    it('TIMEOUT の場合に「位置情報の取得がタイムアウトしました」と表示されること', () => {
      const { result } = renderHook(() => useLocation(), { wrapper });

      act(() => {
        watchErrorCallback!({
          code: 3, // TIMEOUT
          message: 'Timeout',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        });
      });

      expect(result.current.error).toBe('位置情報の取得がタイムアウトしました');
    });

    it('ブラウザが Geolocation 非対応の場合に適切なエラー文言が設定されること', () => {
      // @ts-expect-error test unsupported environment
      delete globalThis.navigator.geolocation;

      const { result } = renderHook(() => useLocation(), { wrapper });

      act(() => {
        result.current.startTracking();
      });

      expect(result.current.error).toBe('お使いのブラウザは位置情報(Geolocation)に対応していません');
    });
  });

  // ==========================================
  // 7. おさんぽデモシミュレーション
  // ==========================================
  describe('Simulation Mode (おさんぽデモ)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <LocationProvider>{children}</LocationProvider>
    );

    it('toggleSimulation でシミュレーションが開始・停止できること', () => {
      const { result } = renderHook(() => useLocation(), { wrapper });
      expect(result.current.isSimulating).toBe(false);

      act(() => {
        result.current.toggleSimulation();
      });

      expect(result.current.isSimulating).toBe(true);

      // タイマーを1ステップ (800ms) 進める
      act(() => {
        vi.advanceTimersByTime(800);
      });

      expect(result.current.userPos).not.toBeNull();
      expect(result.current.isMoving).toBe(true);
      expect(result.current.locationHistory.length).toBeGreaterThan(0);

      // 再度 toggleSimulation で停止
      act(() => {
        result.current.toggleSimulation();
      });

      expect(result.current.isSimulating).toBe(false);
      expect(result.current.isMoving).toBe(false);
    });
  });
});
