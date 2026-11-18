import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_DIR = path.resolve(process.cwd(), '.data/uploads');

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

export async function uploadImageBuffer(
  buffer: Buffer,
  mimetype: string
): Promise<{ url: string; provider: 'cloudinary' | 'local' }> {
  if (isCloudinaryConfigured()) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const url = await new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'ev-journey', resource_type: 'image' },
        (err, result) => {
          if (err || !result) {
            return reject(err || new Error('Cloudinary upload failed'));
          }
          resolve(result.secure_url);
        }
      );
      stream.end(buffer);
    });

    return { url, provider: 'cloudinary' };
  }

  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  const ext = mimetype.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const filename = `ev_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
  return { url: `/api/uploads/${filename}`, provider: 'local' };
}

export function getLocalUploadPath(filename: string): string | null {
  const safeName = path.basename(filename);
  const fullPath = path.join(UPLOAD_DIR, safeName);
  if (fs.existsSync(fullPath)) {
    return fullPath;
  }
  return null;
}
