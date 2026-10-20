import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';
// @ts-expect-error eslint.config.js is a plain JavaScript flat config file without .d.ts
import eslintConfigPromise from '../../eslint.config.js';

describe('eslint.config.js (ESLint 設定およびリンター検証)', () => {
  it('ESLint設定が配列（Flat Config形式）として正しくエクスポートされていること', async () => {
    const config = await eslintConfigPromise;
    expect(Array.isArray(config)).toBe(true);
    expect(config.length).toBeGreaterThan(0);
  });

  it('globalIgnores に dist, coverage, node_modules が登録されていること', async () => {
    const config = await eslintConfigPromise;
    const ignoreConfig = config.find((c: any) => c.ignores && !c.files);
    expect(ignoreConfig).toBeDefined();
    expect(ignoreConfig.ignores).toContain('dist');
    expect(ignoreConfig.ignores).toContain('coverage');
    expect(ignoreConfig.ignores).toContain('node_modules');
  });

  it('TypeScript / TSX ファイルに対する設定ブロックが存在し推奨プラグイン・languageOptionsが設定されていること', async () => {
    const config = await eslintConfigPromise;
    const tsConfigWithLang = config.find(
      (c: any) => c.files && c.languageOptions?.globals && c.files.some((f: any) => typeof f === 'string' && f.includes('ts'))
    );
    expect(tsConfigWithLang).toBeDefined();
    expect(tsConfigWithLang.languageOptions).toBeDefined();
    expect(tsConfigWithLang.languageOptions.globals).toBeDefined();
    expect(tsConfigWithLang.languageOptions.globals.window).toBeDefined();
  });

  it('テストファイル向け設定で vitest / node グローバル変数が有効化されていること', async () => {
    const config = await eslintConfigPromise;
    const testConfig = config.find((c: any) =>
      c.files && c.files.some((f: any) => typeof f === 'string' && f.includes('test'))
    );
    expect(testConfig).toBeDefined();
    expect(testConfig.languageOptions?.globals?.describe).toBeDefined();
    expect(testConfig.languageOptions?.globals?.it).toBeDefined();
    expect(testConfig.languageOptions?.globals?.expect).toBeDefined();
  });

  it('設定ファイル (*.config.*) 向け設定で node グローバル変数が有効化されていること', async () => {
    const config = await eslintConfigPromise;
    const configItem = config.find((c: any) =>
      c.files && c.files.some((f: any) => typeof f === 'string' && f.includes('config'))
    );
    expect(configItem).toBeDefined();
    expect(configItem.languageOptions?.globals?.process).toBeDefined();
  });

  it('ESLint インスタンスで正常な TypeScript コードをリントした際にエラーが0件であること', async () => {
    const eslint = new ESLint();
    const [result] = await eslint.lintText(
      'export interface SafePoint {\n  id: string;\n  name: string;\n}\n\nexport const getPointName = (point: SafePoint): string => {\n  return point.name;\n};\n',
      { filePath: 'src/sampleValid.ts' }
    );

    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(0);
  });

  it('アンダースコア prefix の未使用変数が許可されること (argsIgnorePattern/varsIgnorePattern)', async () => {
    const eslint = new ESLint();
    const [result] = await eslint.lintText(
      'export const handler = (_req: unknown, _res: unknown): void => {\n  // empty handler\n};\n',
      { filePath: 'src/sampleHandler.ts' }
    );

    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(0);
  });

  it('構文エラーや重大なリント違反があるコードでエラーが適切に検出されること', async () => {
    const eslint = new ESLint();
    const [result] = await eslint.lintText(
      'export const bad = (;\n',
      { filePath: 'src/sampleSyntaxError.ts' }
    );

    expect(result.errorCount).toBeGreaterThan(0);
  });
});
