import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');

export interface UploadedFileResult {
  url: string;
  key: string;
  provider: 's3' | 'cloudinary' | 'local';
}

// 許可されたMIMEタイプと対応する拡張子
const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp'
};

// マジックナンバー（ファイルシグネチャ）によるファイル偽装検証
const MAGIC_NUMBERS: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]] // RIFF....WEBP
};

/**
 * 画像ファイルのバイナリヘッダー（マジックナンバー）を検査し、拡張子偽装を防止
 */
export function validateFileSignature(filePath: string, mimeType: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  const magicList = MAGIC_NUMBERS[mimeType];
  if (!magicList) return false;

  const buffer = Buffer.alloc(12);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, 12, 0);
  fs.closeSync(fd);

  return magicList.some(signature => {
    return signature.every((byte, index) => buffer[index] === byte);
  });
}

/**
 * パストラバーサルやスクリプトインジェクションを防ぐ安全なランダムファイル名を生成
 */
export function generateSafeFileName(originalName: string, mimeType: string): string {
  const ext = ALLOWED_MIME_TYPES[mimeType] || path.extname(originalName).toLowerCase() || '.jpg';
  const randomBytes = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  return `hazard_${timestamp}_${randomBytes}${ext}`;
}

/**
 * セキュアな画像アップロードサービス
 * 環境変数 STORAGE_PROVIDER (s3 | cloudinary | local) に応じて保存先を切替
 */
export async function uploadImage(file: Express.Multer.File, port: string | number): Promise<UploadedFileResult> {
  // 1. MIMEタイプ検証
  if (!ALLOWED_MIME_TYPES[file.mimetype]) {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    throw new Error(`許可されていないファイル形式です: ${file.mimetype}。JPEG, PNG, GIF, WEBP のみ対応しています。`);
  }

  // 2. マジックナンバー検証 (バイナリレベルでの偽装防止)
  if (!validateFileSignature(file.path, file.mimetype)) {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    throw new Error('ファイル内容が画像形式と一致しません（拡張子偽装の可能性があります）。');
  }

  const provider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();

  if (provider === 's3') {
    return uploadToS3(file);
  } else if (provider === 'cloudinary') {
    return uploadToCloudinary(file);
  } else {
    return uploadToLocal(file, port);
  }
}

/**
 * AWS S3 へのセキュアアップロード
 */
async function uploadToS3(file: Express.Multer.File): Promise<UploadedFileResult> {
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  const region = process.env.AWS_REGION || 'ap-northeast-1';

  if (!bucketName) {
    console.warn('⚠️ AWS_S3_BUCKET_NAME が未設定です。ローカルストレージにフォールバックします。');
    return uploadToLocal(file, process.env.PORT || 3001);
  }

  try {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    const safeKey = `hazards/${generateSafeFileName(file.originalname, file.mimetype)}`;
    const fileBuffer = fs.readFileSync(file.path);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: safeKey,
      Body: fileBuffer,
      ContentType: file.mimetype,
      ServerSideEncryption: 'AES256', // サーバーサイド暗号化
    });

    await s3Client.send(command);

    // 一時ローカルファイルを安全に削除
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    const cdnDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
    const url = cdnDomain
      ? `https://${cdnDomain}/${safeKey}`
      : `https://${bucketName}.s3.${region}.amazonaws.com/${safeKey}`;

    return { url, key: safeKey, provider: 's3' };
  } catch (err: any) {
    console.error('S3へのアップロードに失敗しました。ローカルストレージにフォールバックします:', err.message);
    return uploadToLocal(file, process.env.PORT || 3001);
  }
}

/**
 * Cloudinary へのセキュアアップロード（自動最適化・WebP変換）
 */
async function uploadToCloudinary(file: Express.Multer.File): Promise<UploadedFileResult> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    console.warn('⚠️ CLOUDINARY_CLOUD_NAME が未設定です。ローカルストレージにフォールバックします。');
    return uploadToLocal(file, process.env.PORT || 3001);
  }

  try {
    const cloudinary = (await import('cloudinary')).v2;
    cloudinary.config({
      cloud_name: cloudName,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });

    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'hazard_map',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' }, // 最大サイズ制限
        { quality: 'auto' },                          // 最適圧縮
        { fetch_format: 'auto' }                      // WebP/AVIF 自動配信
      ]
    });

    // 一時ローカルファイルを安全に削除
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    return { url: result.secure_url, key: result.public_id, provider: 'cloudinary' };
  } catch (err: any) {
    console.error('Cloudinaryへのアップロードに失敗しました。ローカルストレージにフォールバックします:', err.message);
    return uploadToLocal(file, process.env.PORT || 3001);
  }
}

/**
 * ローカルストレージへのセキュア保存（フォールバック用）
 */
async function uploadToLocal(file: Express.Multer.File, port: string | number): Promise<UploadedFileResult> {
  const filename = path.basename(file.path);
  const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
  const url = `${baseUrl}/uploads/${filename}`;
  return { url, key: filename, provider: 'local' };
}

/**
 * 不要になった画像の削除処理（S3 / Cloudinary / Local）
 */
export async function deleteImage(imageUrlOrKey: string): Promise<boolean> {
  if (!imageUrlOrKey) return false;

  try {
    const provider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();

    if (provider === 'cloudinary' && process.env.CLOUDINARY_CLOUD_NAME) {
      const cloudinary = (await import('cloudinary')).v2;
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      // URLからpublic_idを抽出
      const publicId = imageUrlOrKey.includes('/')
        ? imageUrlOrKey.split('/').slice(-2).join('/').replace(/\.[^/.]+$/, '')
        : imageUrlOrKey;
      await cloudinary.uploader.destroy(publicId);
      return true;
    }

    if (provider === 's3' && process.env.AWS_S3_BUCKET_NAME) {
      const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      const s3Client = new S3Client({
        region: process.env.AWS_REGION || 'ap-northeast-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
      });
      const key = imageUrlOrKey.includes('.com/') ? imageUrlOrKey.split('.com/')[1] : imageUrlOrKey;
      if (key) {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: key
        }));
      }
      return true;
    }

    // Local ファイル削除
    const filename = path.basename(imageUrlOrKey);
    const candidates = [
      path.join(UPLOADS_DIR, filename),
      path.join(process.cwd(), 'uploads', filename),
      path.join(process.cwd(), 'backend', 'uploads', filename),
    ];
    for (const localPath of candidates) {
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
        return true;
      }
    }
    return false;
  } catch (err: any) {
    console.warn('画像の削除に失敗しました（継続します）:', err.message);
    return false;
  }
}
