import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type React from 'react';
import App from '../App';
import type { Hazard } from '../types';

// Mock react-leaflet components
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children, position, icon, eventHandlers }: { children?: React.ReactNode; position?: unknown; icon?: { options?: { className?: string } }; eventHandlers?: { click?: () => void } }) => (
    <div 
      data-testid="map-marker" 
      data-position={JSON.stringify(position)}
      data-icon-class={icon?.options?.className}
      onClick={eventHandlers?.click}
    >
      {children}
    </div>
  ),
  Popup: ({ children }: { children?: React.ReactNode }) => <div data-testid="map-popup">{children}</div>,
  useMap: () => ({
    setView: vi.fn(),
    getZoom: vi.fn().mockReturnValue(15),
  }),
  useMapEvents: vi.fn(),
}));

describe('Hazard Form & Map Interaction Tests (投稿フォーム・リスト動作テスト)', () => {
  const mockHazards: Hazard[] = [
    {
      id: 1,
      lat: 35.6895,
      lng: 139.6917,
      type: 'Traffic',
      description: 'みちが せまくて くるまが あぶない',
      imageUrl: null,
      comments: [
        { id: 101, text: 'きをつけます！', createdAt: '2026-08-31T00:00:00Z' }
      ]
    },
    {
      id: 2,
      lat: 35.6900,
      lng: 139.6920,
      type: 'Lighting',
      description: 'よるになると がいとうが くらい',
      imageUrl: 'http://localhost:3001/uploads/test.jpg',
      comments: []
    }
  ];

  beforeEach(() => {
    // Mock localStorage
    const store: Record<string, string> = {
      homePos: JSON.stringify([35.6895, 139.6917]),
      myHazardIds: JSON.stringify([1]), // ID 1 は自分の投稿
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => store[key] || null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, val) => {
      store[key] = val;
    });

    // Mock fetch
    globalThis.fetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      // 1. Comments POST
      if (url.includes('/comments') && options?.method === 'POST') {
        const body = JSON.parse(options.body as string);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 201,
            text: body.text,
            createdAt: new Date().toISOString()
          }),
        } as Response);
      }

      // 2. Hazard PUT (Update)
      if (url.includes('/api/hazards/1') && options?.method === 'PUT') {
        const updatedHazard: Hazard = {
          ...mockHazards[0],
          description: 'しんごうが みえにくい（こうしん）',
        };
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(updatedHazard),
        } as Response);
      }

      // 3. Hazard DELETE
      if (url.includes('/api/hazards/1') && options?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        } as Response);
      }

      // 4. Hazard POST (Create)
      if (url.endsWith('/api/hazards') && options?.method === 'POST') {
        const createdHazard: Hazard = {
          id: 3,
          lat: 35.6950,
          lng: 139.6980,
          type: 'Crime',
          description: 'ふしんしゃに ちゅうい',
          imageUrl: null,
          comments: []
        };
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(createdHazard),
        } as Response);
      }

      // 5. Hazard GET (List)
      if (url.includes('/api/hazards') && (!options || !options.method || options.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockHazards),
        } as Response);
      }

      return Promise.reject(new Error(`Unhandled request: ${url}`));
    });

    // Mock alert and confirm
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('初期ロード時に危険箇所一覧がAPIから取得され、リストに表示されること', async () => {
    render(<App />);

    await waitFor(() => {
      const items = screen.getAllByText('みちが せまくて くるまが あぶない');
      expect(items.length).toBeGreaterThanOrEqual(1);
      const lightingItems = screen.getAllByText('よるになると がいとうが くらい');
      expect(lightingItems.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('マップ上のピン（マーカー）が危険箇所数分レンダリングされること', async () => {
    render(<App />);

    await waitFor(() => {
      // HomePos(1) + mockHazards(2) = 3 markers
      const markers = screen.getAllByTestId('map-marker');
      expect(markers.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('マップ座標が未選択の状態で投稿フォームを送信するとアラートを表示して中断すること', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('みちが せまくて くるまが あぶない').length).toBeGreaterThan(0);
    });

    const textarea = screen.getByPlaceholderText('れい：みちが くらい、くるまが おおい');
    fireEvent.change(textarea, { target: { value: 'テストの危険箇所' } });

    const submitBtn = screen.getByRole('button', { name: 'ほうこくする！' });
    fireEvent.click(submitBtn);

    expect(window.alert).toHaveBeenCalledWith('ちずを おして ばしょを えらんでね！');
  });

  it('自分の投稿 (ID 1) のカード内には「なおす📝」ボタンが表示され、他人の投稿 (ID 2) のカード内には表示されないこと', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('みちが せまくて くるまが あぶない').length).toBeGreaterThan(0);
    });

    // リスト内の ID 1 の要素を取得
    const card1 = document.getElementById('hazard-1')!;
    expect(card1).toBeInTheDocument();
    expect(within(card1).getByRole('button', { name: 'なおす📝' })).toBeInTheDocument();

    // リスト内の ID 2 の要素を取得
    const card2 = document.getElementById('hazard-2')!;
    expect(card2).toBeInTheDocument();
    expect(within(card2).queryByRole('button', { name: 'なおす📝' })).not.toBeInTheDocument();
  });

  it('「なおす📝」ボタンを押すと編集モードになり、フォームに既存データがセットされ「やめる」ボタンが表示されること', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('みちが せまくて くるまが あぶない').length).toBeGreaterThan(0);
    });

    const card1 = document.getElementById('hazard-1')!;
    const editBtn = within(card1).getByRole('button', { name: 'なおす📝' });
    fireEvent.click(editBtn);

    // フォームタイトルが「ほうこくを なおす」に変わること
    expect(screen.getByText('ほうこくを なおす')).toBeInTheDocument();

    // テキストエリアに既存の説明がセットされていること
    const textarea = screen.getByPlaceholderText('れい：みちが くらい、くるまが おおい') as HTMLTextAreaElement;
    expect(textarea.value).toBe('みちが せまくて くるまが あぶない');

    // 「やめる」ボタンが表示され、押すとキャンセルされること
    const cancelBtn = screen.getByRole('button', { name: 'やめる' });
    expect(cancelBtn).toBeInTheDocument();
    fireEvent.click(cancelBtn);

    expect(screen.getByText('あぶないよ！をおしえる')).toBeInTheDocument();
  });

  it('コメント入力欄にテキストを入力して「おく」ボタンを押すと、コメント追加APIが呼ばれ画面に反映されること', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('みちが せまくて くるまが あぶない').length).toBeGreaterThan(0);
    });

    const card1 = document.getElementById('hazard-1')!;
    const commentInput = within(card1).getByPlaceholderText('ありがとう！など...');
    fireEvent.change(commentInput, { target: { value: 'あぶないので迂回します！' } });

    const submitBtn = within(card1).getByRole('button', { name: 'おく' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getAllByText('あぶないので迂回します！').length).toBeGreaterThan(0);
    });
  });

  it('カテゴリ選択のドロップダウンで「ぼうはん・ふしんしゃ 👮」などを選択できること', async () => {
    render(<App />);

    const select = screen.getByLabelText('なにが あぶない？') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'Crime' } });

    expect(select.value).toBe('Crime');
  });
});
