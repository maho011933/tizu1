import '@testing-library/jest-dom';

// Mock EventSource for JSDOM
if (typeof window !== 'undefined' && typeof window.EventSource === 'undefined') {
  class MockEventSource {
    url: string;
    onmessage: ((ev: MessageEvent) => void) | null = null;
    onerror: ((ev: Event) => void) | null = null;
    constructor(url: string) {
      this.url = url;
    }
    close() {}
  }
  // @ts-expect-error Mock EventSource
  globalThis.EventSource = MockEventSource;
}

// Mock window.scrollTo
if (typeof window !== 'undefined' && !window.scrollTo) {
  window.scrollTo = () => {};
}

// Mock window.matchMedia
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

