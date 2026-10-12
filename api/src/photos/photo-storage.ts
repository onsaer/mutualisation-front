import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/** Nom d'une photo enregistrée : identifiant aléatoire, toujours en WebP. */
export const PHOTO_KEY = /^[0-9a-f-]{36}\.webp$/;

/** Où sont rangées les photos, et sous quelle adresse elles sont servies. */
export abstract class PhotoStorage {
  /** Enregistre la photo et renvoie son adresse publique. */
  abstract save(key: string, data: Buffer): Promise<string>;
  /** Adresse publique d'une photo de ce stockage (pour refuser les liens externes). */
  abstract urlOf(key: string): string;

  /** Vrai si l'adresse désigne une photo envoyée sur ce stockage. */
  isOwnUrl(url: string): boolean {
    const key = url.split('/').at(-1) ?? '';
    return PHOTO_KEY.test(key) && url === this.urlOf(key);
  }
}

/** Disque local (`PHOTO_DIR`, `./uploads` par défaut), servi par l'API sur `/api/photos/`. */
export class LocalPhotoStorage extends PhotoStorage {
  readonly dir: string;

  constructor(dir: string) {
    super();
    this.dir = resolve(dir);
  }

  override async save(key: string, data: Buffer): Promise<string> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(resolve(this.dir, key), data);
    return this.urlOf(key);
  }

  override urlOf(key: string): string {
    return `/api/photos/${key}`;
  }
}

/**
 * Stockage objet compatible S3 (Scaleway, OVHcloud, Cloudflare R2, MinIO…), à privilégier en
 * production. Les photos sont servies directement par le stockage ou un CDN (`PHOTO_PUBLIC_URL`).
 */
export class S3PhotoStorage extends PhotoStorage {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
    private readonly publicUrl: string,
  ) {
    super();
  }

  override async save(key: string, data: Buffer): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    return this.urlOf(key);
  }

  override urlOf(key: string): string {
    return `${this.publicUrl.replace(/\/$/, '')}/${key}`;
  }
}

/**
 * `PHOTO_STORAGE=local` (par défaut) ou `s3`. En S3 : `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`
 * (fournisseurs autres qu'AWS), `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `PHOTO_PUBLIC_URL`.
 */
export function photoStorageFromEnv(env = process.env): PhotoStorage {
  if (env['PHOTO_STORAGE'] !== 's3')
    return new LocalPhotoStorage(env['PHOTO_DIR'] ?? 'uploads');
  const required = (k: string) => {
    const v = env[k];
    if (!v) throw new Error(`${k} est obligatoire avec PHOTO_STORAGE=s3.`);
    return v;
  };
  const client = new S3Client({
    region: env['S3_REGION'] ?? 'fr-par',
    endpoint: env['S3_ENDPOINT'],
    forcePathStyle: env['S3_FORCE_PATH_STYLE'] === '1',
    credentials: {
      accessKeyId: required('S3_ACCESS_KEY_ID'),
      secretAccessKey: required('S3_SECRET_ACCESS_KEY'),
    },
  });
  return new S3PhotoStorage(
    client,
    required('S3_BUCKET'),
    required('PHOTO_PUBLIC_URL'),
  );
}
