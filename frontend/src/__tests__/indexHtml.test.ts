import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('index.html (HTML構造・メタデータ・PWA/モバイル・アクセシビリティ検証)', () => {
  const htmlPath = path.resolve(__dirname, '../../index.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');

  it('HTMLファイルが存在しUTF-8で正しく読み込めること', () => {
    expect(fs.existsSync(htmlPath)).toBe(true);
    expect(html.length).toBeGreaterThan(0);
  });

  it('HTML5標準のDOCTYPE宣言および日本語（lang="ja"）が設定されていること', () => {
    expect(html).toMatch(/<!doctype html>/i);
    expect(html).toMatch(/<html\s+lang="ja">/i);
  });

  it('文字エンコーディングとして UTF-8 が設定されていること', () => {
    expect(html).toMatch(/<meta\s+charset="UTF-8"\s*\/?>/i);
  });

  it('<title> タグが1箇所のみ定義され、重複がなく「みんなの安全マップ」であること', () => {
    const titleMatches = html.match(/<title>[\s\S]*?<\/title>/gi);
    expect(titleMatches).not.toBeNull();
    expect(titleMatches?.length).toBe(1);
    expect(titleMatches?.[0]).toContain('みんなの安全マップ');
  });

  it('<meta name="viewport"> が1箇所のみ定義され、重複がなくカバー領域と拡大縮小が制御されていること', () => {
    const viewportMatches = html.match(/<meta\s+name="viewport"[^>]*>/gi);
    expect(viewportMatches).not.toBeNull();
    expect(viewportMatches?.length).toBe(1);
    expect(viewportMatches?.[0]).toContain('width=device-width');
    expect(viewportMatches?.[0]).toContain('viewport-fit=cover');
    expect(viewportMatches?.[0]).toContain('user-scalable=no');
  });

  it('アプリ説明の meta description が正しく設定されていること', () => {
    expect(html).toMatch(/<meta\s+name="description"\s+content="[^"]*まちの\s*あんぜん[^"]*"\s*\/?>/i);
  });

  it('PWAおよびモバイルWebアプリ用のメタタグが正しく定義されていること', () => {
    expect(html).toMatch(/<meta\s+name="theme-color"\s+content="#2C3E50"\s*\/?>/i);
    expect(html).toMatch(/<meta\s+name="mobile-web-app-capable"\s+content="yes"\s*\/?>/i);
    expect(html).toMatch(/<meta\s+name="apple-mobile-web-app-capable"\s+content="yes"\s*\/?>/i);
    expect(html).toMatch(/<meta\s+name="apple-mobile-web-app-status-bar-style"\s+content="black-translucent"\s*\/?>/i);
    expect(html).toMatch(/<meta\s+name="apple-mobile-web-app-title"\s+content="安全マップ"\s*\/?>/i);
    expect(html).toMatch(/<link\s+rel="apple-touch-icon"\s+href="\/apple-touch-icon\.png"\s*\/?>/i);
  });

  it('SNSシェア用の OGP (Open Graph Protocol) および Twitter Card メタタグが完備されていること', () => {
    expect(html).toMatch(/<meta\s+property="og:type"\s+content="website"\s*\/?>/i);
    expect(html).toMatch(/<meta\s+property="og:title"\s+content="みんなの安全マップ"\s*\/?>/i);
    expect(html).toMatch(/<meta\s+property="og:description"\s+content="[^"]*まちの\s*あんぜん[^"]*"\s*\/?>/i);
    expect(html).toMatch(/<meta\s+property="og:site_name"\s+content="みんなの安全マップ"\s*\/?>/i);
    expect(html).toMatch(/<meta\s+name="twitter:card"\s+content="summary"\s*\/?>/i);
  });

  it('React マウント対象の root div が存在すること', () => {
    expect(html).toMatch(/<div\s+id="root">\s*<\/div>/i);
  });

  it('メインスクリプト（src/main.tsx）が module として読み込まれていること', () => {
    expect(html).toMatch(/<script\s+type="module"\s+src="\/src\/main\.tsx">\s*<\/script>/i);
  });

  it('JavaScript 無効環境向けの子供向け親切な noscript タグが配置されていること', () => {
    expect(html).toMatch(/<noscript>[\s\S]*?JavaScript[\s\S]*?<\/noscript>/i);
  });
});
