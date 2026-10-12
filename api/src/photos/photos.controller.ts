import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  Controller,
  ExceptionFilter,
  Get,
  Inject,
  NotFoundException,
  Param,
  PayloadTooLargeException,
  Post,
  Res,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type {} from 'multer';
import { Public } from '../auth/auth.js';
import { LocalPhotoStorage, PHOTO_KEY, PhotoStorage } from './photo-storage.js';
import { PhotosService } from './photos.service.js';

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

/** Message en français quand le fichier dépasse la limite. */
@Catch(PayloadTooLargeException)
class TooLargeFilter implements ExceptionFilter {
  catch(_: PayloadTooLargeException, host: ArgumentsHost) {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(413)
      .json({ statusCode: 413, message: 'Photo trop lourde (10 Mo maximum).' });
  }
}

@Controller('photos')
export class PhotosController {
  constructor(
    private readonly photos: PhotosService,
    @Inject(PhotoStorage) private readonly storage: PhotoStorage,
  ) {}

  /** Envoi d'une photo (champ `photo`, multipart) ; renvoie son adresse à mettre dans l'annonce. */
  @Post()
  @UseFilters(TooLargeFilter)
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: MAX_PHOTO_BYTES, files: 1 },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file)
      throw new BadRequestException('Aucune photo reçue (champ « photo »).');
    return this.photos.upload(file.buffer);
  }

  /** Photos du stockage local (en S3, elles sont servies directement par le stockage). */
  @Public()
  @Get(':key')
  serve(@Param('key') key: string, @Res() res: Response) {
    if (!(this.storage instanceof LocalPhotoStorage) || !PHOTO_KEY.test(key)) {
      throw new NotFoundException('Photo introuvable.');
    }
    res.sendFile(
      key,
      {
        root: this.storage.dir,
        headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
      },
      (err) => {
        if (err && !res.headersSent)
          res
            .status(404)
            .json({ statusCode: 404, message: 'Photo introuvable.' });
      },
    );
  }
}
