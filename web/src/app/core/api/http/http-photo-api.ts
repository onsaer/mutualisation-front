import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { PhotoApi } from '../photo-api';
import { API_BASE_URL, request } from './http-api.utils';

/** `POST /api/photos` (multipart). L'API réduit la photo et retire ses métadonnées. */
@Injectable()
export class HttpPhotoApi extends PhotoApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL)}/photos`;

  override async upload(photo: Blob): Promise<string> {
    const body = new FormData();
    body.append('photo', photo, 'photo.jpg');
    const { url } = await request(this.http.post<{ url: string }>(this.url, body));
    return url;
  }
}
