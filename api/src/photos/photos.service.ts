import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import sharp, { type Sharp } from 'sharp';
import { PhotoStorage } from './photo-storage.js';

const ACCEPTED = new Set(['jpeg', 'png', 'webp', 'heif']);
/** Côté le plus long après réduction : assez pour un écran Retina, léger sur mobile. */
const MAX_SIDE = 1600;

@Injectable()
export class PhotosService {
  constructor(@Inject(PhotoStorage) private readonly storage: PhotoStorage) {}

  /**
   * Vérifie que le fichier est bien une image, la redresse (orientation EXIF), la réduit et
   * la convertit en WebP. Les métadonnées sont supprimées, dont la position GPS des photos
   * prises au téléphone : elle révélerait le domicile de la personne.
   */
  async upload(data: Buffer): Promise<{ url: string }> {
    let image: Sharp;
    try {
      image = sharp(data, { failOn: 'error', limitInputPixels: 60_000_000 });
      const { format } = await image.metadata();
      if (!format || !ACCEPTED.has(format)) throw new Error(format);
    } catch {
      throw new BadRequestException(
        'Format non pris en charge : envoyez une photo JPEG, PNG ou WebP.',
      );
    }
    const webp = await image
      .rotate()
      .resize({
        width: MAX_SIDE,
        height: MAX_SIDE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();
    return { url: await this.storage.save(`${randomUUID()}.webp`, webp) };
  }
}
