import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DATA_FILE = path.join(__dirname, 'test_hazards.json');

// テスト用データファイルを環境変数に設定
process.env.HAZARDS_DATA_FILE = TEST_DATA_FILE;
process.env.NODE_ENV = 'test';

// 動的インポートで環境変数を反映
const { app } = await import('../server.js');

describe('Backend Hazard API Endpoints (バックエンドAPIテスト)', () => {
  const initialHazards = [
    {
      id: 1,
      lat: 35.6895,
      lng: 139.6917,
      type: 'Traffic',
      description: '見通しの悪い交差点',
      imageUrl: null,
      comments: [
        { id: 1001, text: '注意します', createdAt: '2026-08-31T00:00:00.000Z' }
      ]
    },
    {
      id: 2,
      lat: 35.6900,
      lng: 139.6920,
      type: 'Lighting',
      description: '街灯が消えている',
      imageUrl: null,
      comments: []
    }
  ];

  beforeEach(() => {
    fs.writeFileSync(TEST_DATA_FILE, JSON.stringify(initialHazards, null, 2), 'utf8');
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DATA_FILE)) {
      fs.unlinkSync(TEST_DATA_FILE);
    }
  });

  describe('GET /api/hazards', () => {
    it('登録されているハザード一覧を正常に取得できること', async () => {
      const res = await request(app).get('/api/hazards');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0].description).toBe('見通しの悪い交差点');
    });
  });

  describe('POST /api/hazards', () => {
    it('新しいハザードを正常に作成でき、IDが自動付番されること', async () => {
      const newHazardData = {
        lat: '35.6950',
        lng: '139.6980',
        type: 'Crime',
        description: '不審者目撃情報あり'
      };

      const res = await request(app)
        .post('/api/hazards')
        .field('lat', newHazardData.lat)
        .field('lng', newHazardData.lng)
        .field('type', newHazardData.type)
        .field('description', newHazardData.description);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.id).toBe(3); // 既存最大ID 2 の次
      expect(res.body.lat).toBe(35.6950);
      expect(res.body.lng).toBe(139.6980);
      expect(res.body.type).toBe('Crime');
      expect(res.body.description).toBe('不審者目撃情報あり');
      expect(res.body.comments).toEqual([]);

      // ファイルに書き込まれたことを検証
      const fileData = JSON.parse(fs.readFileSync(TEST_DATA_FILE, 'utf8'));
      expect(fileData.length).toBe(3);
    });
  });

  describe('POST /api/hazards/:id/comments', () => {
    it('指定したハザードにコメントを正常に追加できること', async () => {
      const res = await request(app)
        .post('/api/hazards/1/comments')
        .send({ text: 'パトロールを強化しました' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.text).toBe('パトロールを強化しました');
      expect(res.body).toHaveProperty('createdAt');

      // データファイル内のコメントが増えていることを確認
      const fileData = JSON.parse(fs.readFileSync(TEST_DATA_FILE, 'utf8'));
      const target = fileData.find((h: any) => h.id === 1);
      expect(target.comments.length).toBe(2);
    });

    it('コメント本文が空の場合は 400 エラーを返すこと', async () => {
      const res = await request(app)
        .post('/api/hazards/1/comments')
        .send({ text: '' });

      expect(res.status).toBe(400);
      expect(res.text).toBe('Comment text is required');
    });

    it('存在しないハザードIDの場合は 404 エラーを返すこと', async () => {
      const res = await request(app)
        .post('/api/hazards/9999/comments')
        .send({ text: 'テストコメント' });

      expect(res.status).toBe(404);
      expect(res.text).toBe('Hazard not found');
    });
  });

  describe('PUT /api/hazards/:id', () => {
    it('ハザードのカテゴリや説明文を正常に更新できること', async () => {
      const res = await request(app)
        .put('/api/hazards/1')
        .field('type', 'Disaster')
        .field('description', '水路の増水に注意（更新済）');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
      expect(res.body.type).toBe('Disaster');
      expect(res.body.description).toBe('水路の増水に注意（更新済）');

      const fileData = JSON.parse(fs.readFileSync(TEST_DATA_FILE, 'utf8'));
      const target = fileData.find((h: any) => h.id === 1);
      expect(target.type).toBe('Disaster');
      expect(target.description).toBe('水路の増水に注意（更新済）');
    });

    it('存在しないハザードIDを更新しようとした場合は 404 エラーを返すこと', async () => {
      const res = await request(app)
        .put('/api/hazards/9999')
        .field('type', 'Other')
        .field('description', '存在しないデータ');

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/hazards/:id', () => {
    it('指定したハザードを正常に削除（解決）できること', async () => {
      const res = await request(app).delete('/api/hazards/1');
      expect(res.status).toBe(200);
      expect(res.text).toBe('Hazard resolved');

      const fileData = JSON.parse(fs.readFileSync(TEST_DATA_FILE, 'utf8'));
      expect(fileData.length).toBe(1);
      expect(fileData.find((h: any) => h.id === 1)).toBeUndefined();
    });
  });
});
