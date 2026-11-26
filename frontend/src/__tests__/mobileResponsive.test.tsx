import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type React from 'react';
import App from '../App';
import type { Hazard } from '../types';

const mockInvalidateSize = vi.fn();

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }: { children?: React.ReactNode }) => <div data-testid="map-marker">{children}</div>,
  Popup: ({ children }: { children?: React.ReactNode }) => <div data-testid="map-popup">{children}</div>,
  Circle: () => <div data-testid="map-circle" />,
  Polyline: () => <div data-testid="map-polyline" />,
  useMap: () => ({
    setView: vi.fn(),
    getZoom: vi.fn().mockReturnValue(15),
    invalidateSize: mockInvalidateSize,
  }),
  useMapEvents: vi.fn(),
}));

describe('Mobile Responsive & Tab Switching Tests (スマホ表示・タブ切り替えテスト)', () => {
  const mockHazards: Hazard[] = [
    {
      id: 1,
      lat: 38.3582,
      lng: 140.3705,
      type: 'Traffic',
      description: 'こうさてんが みえにくい',
      imageUrl: null,
      comments: [],
    },
  ];

  beforeEach(() => {
    mockInvalidateSize.mockClear();
    const store: Record<string, string> = {
      myHazardIds: JSON.stringify([1]),
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => store[key] || null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, val) => {
      store[key] = val;
    });

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/hazards')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockHazards),
        } as Response);
      }
      return Promise.reject(new Error(`Unhandled request: ${url}`));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('スマホ用ボトムタブが表示され、ちず・ほうこく・いちらんを切り替えられること', async () => {
    const { container } = render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('こうさてんが みえにくい').length).toBeGreaterThan(0);
    });

    const mainEl = container.querySelector('.app-main');
    expect(mainEl).toHaveAttribute('data-mobile-tab', 'map');

    const nav = screen.getByRole('navigation', { name: 'スマホ切り替えメニュー' });
    expect(nav).toBeInTheDocument();

    fireEvent.click(within(nav).getByRole('button', { name: /ほうこく/ }));
    expect(mainEl).toHaveAttribute('data-mobile-tab', 'form');

    fireEvent.click(within(nav).getByRole('button', { name: /いちらん/ }));
    expect(mainEl).toHaveAttribute('data-mobile-tab', 'list');

    fireEvent.click(within(nav).getByRole('button', { name: /ちず/ }));
    expect(mainEl).toHaveAttribute('data-mobile-tab', 'map');
  });

  it('「なおす📝」を押すとスマホ表示でもほうこくフォームタブに切り替わること', async () => {
    const { container } = render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'なおす📝' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'なおす📝' }));
    const mainEl = container.querySelector('.app-main');
    expect(mainEl).toHaveAttribute('data-mobile-tab', 'form');
  });

  it('マップのみかた凡例を開閉できること', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText('凡例をとじる')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('凡例をとじる'));
    expect(screen.getByRole('button', { name: /みかた/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /みかた/ }));
    expect(screen.getByLabelText('凡例をとじる')).toBeInTheDocument();
  });

  it('タブ切り替え後に Leaflet の invalidateSize が呼ばれること', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('こうさてんが みえにくい').length).toBeGreaterThan(0);
    });

    const nav = screen.getByRole('navigation', { name: 'スマホ切り替えメニュー' });
    fireEvent.click(within(nav).getByRole('button', { name: /ほうこく/ }));
    fireEvent.click(within(nav).getByRole('button', { name: /ちず/ }));

    await waitFor(() => {
      expect(mockInvalidateSize).toHaveBeenCalled();
    });
  });

  it('横画面サイズの初期表示では凡例が折りたたまれた状態で開始すること', async () => {
    const origWidth = window.innerWidth;
    const origHeight = window.innerHeight;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 844 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 390 });

    try {
      render(<App />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /みかた/ })).toBeInTheDocument();
      });
      expect(screen.queryByLabelText('凡例をとじる')).not.toBeInTheDocument();
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: origWidth });
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: origHeight });
    }
  });
});
