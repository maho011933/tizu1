import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface UploadedFileResult {
  url: string;
  key: string;
  provider: 's3' | 'cloudinary' | 'local';
}

/**
 * 画像アップロードの抽象ストレージサービス
 * 環境変数 STORAGE_PROVIDER (s3 | cloudinary | local) に応じて保存先を切替
 */
export async function uploadImage(file: Express.Multer.File, port: string | number): Promise<UploadedFileResult> {
  const provider = process.env.STORAGE_PROVIDER || 'local';

  if (provider === 's3') {
    return uploadToS3(file);
  } else if (provider === 'cloudinary') {
    return uploadToCloudinary(file);
  } else {
    return uploadToLocal(file, port);
  }
}

/**
 * AWS S3 へのアップロード（@aws-sdk/client-s3 連携準備）
 */
async function uploadToS3(file: Express.Multer.File): Promise<UploadedFileResult> {
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  const region = process.env.AWS_REGION || 'ap-northeast-1';

  if (!bucketName) {
    console.warn('⚠️ AWS_S3_BUCKET_NAME is not configured. Falling back to local storage.');
    return uploadToLocal(file, process.env.PORT || 3001);
  }

  try {
    // AWS SDK (ダイナミックインポートまたは連携プレースホルダー)
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    const fileKey = `hazards/${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    const fileStream = fs.createReadStream(file.path);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      Body: fileStream,
      ContentType: file.mimetype,
      ACL: 'public-read', // または S3 bucket policy に従う
    });

    await s3Client.send(command);

    // 一時ローカルファイルを削除
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    const url = `https://${bucketName}.s3.${region}.amazonaws.com/${fileKey}`;
    return { url, key: fileKey, provider: 's3' };
  } catch (err) {
    console.error('Failed to upload to S3, falling back to local storage:', err);
    return uploadToLocal(file, process.env.PORT || 3001);
  }
}

/**
 * Cloudinary へのアップロード
 */
async function uploadToCloudinary(file: Express.Multer.File): Promise<UploadedFileResult> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    console.warn('⚠️ CLOUDINARY_CLOUD_NAME is not configured. Falling back to local storage.');
    return uploadToLocal(file, process.env.PORT || 3001);
  }

  try {
    const cloudinary = (await import('cloudinary')).v2;
    cloudinary.config({
      cloud_name: cloudName,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'hazard_map',
    });

    // 一時ローカルファイルを削除
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    return { url: result.secure_url, key: result.public_id, provider: 'cloudinary' };
  } catch (err) {
    console.error('Failed to upload to Cloudinary, falling back to local storage:', err);
    return uploadToLocal(file, process.env.PORT || 3001);
  }
}

/**
 * セキュアなローカルストレージアップロード（検証・フォールバック用）
 */
async function uploadToLocal(file: Express.Multer.File, port: string | number): Promise<UploadedFileResult> {
  const filename = path.basename(file.path);
  const url = `http://localhost:${port}/uploads/${filename}`;
  return { url, key: filename, provider: 'local' };
}
