import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  generateSafeFileName,
  validateFileSignature,
  uploadImage,
  deleteImage
} from '../services/storageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DIR = path.join(__dirname, 'test_storage_temp');

describe('StorageService Tests (画像ストレージサービス検証)', () => {
  beforeEach(() => {
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('generateSafeFileName', () => {
    it('ランダム文字列とタイムスタンプを含む安全なファイル名を生成すること', () => {
      const name = generateSafeFileName('test.png', 'image/png');
      expect(name).toMatch(/^hazard_\d+_[a-f0-9]{32}\.png$/);
    });

    it('拡張子が偽装されている場合でもMIMEタイプに応じた拡張子を付与すること', () => {
      const name = generateSafeFileName('evil.exe', 'image/jpeg');
      expect(name.endsWith('.jpg')).toBe(true);
    });
  });

  describe('validateFileSignature', () => {
    it('正常なPNGマジックナンバーを判定できること', () => {
      const testPngPath = path.join(TEST_DIR, 'valid.png');
      const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
      fs.writeFileSync(testPngPath, pngHeader);

      const isValid = validateFileSignature(testPngPath, 'image/png');
      expect(isValid).toBe(true);
    });

    it('不正なシグネチャのファイルを偽装として判定できること', () => {
      const fakePngPath = path.join(TEST_DIR, 'fake.png');
      fs.writeFileSync(fakePngPath, Buffer.from('NOT_A_PNG_FILE_HEADER'));

      const isValid = validateFileSignature(fakePngPath, 'image/png');
      expect(isValid).toBe(false);
    });

    it('存在しないファイルパスの場合はfalseを返すこと', () => {
      const nonExistent = path.join(TEST_DIR, 'non_existent.jpg');
      expect(validateFileSignature(nonExistent, 'image/jpeg')).toBe(false);
    });
  });

  describe('uploadImage & deleteImage (Local Provider)', () => {
    it('未許可のMIMEタイプの場合は例外をスローすること', async () => {
      const dummyFile: any = {
        path: path.join(TEST_DIR, 'test.txt'),
        mimetype: 'text/plain',
        originalname: 'test.txt'
      };
      fs.writeFileSync(dummyFile.path, 'hello world');

      await expect(uploadImage(dummyFile, 3001)).rejects.toThrow('許可されていないファイル形式です');
    });

    it('パストラバーサルを含むファイル名の削除を安全に拒否すること', async () => {
      const result = await deleteImage('../../../etc/passwd');
      expect(result).toBe(false);
    });

    it('空文字列や無効なキーの削除で安全にfalseを返すこと', async () => {
      const result = await deleteImage('');
      expect(result).toBe(false);
    });
  });
});
