import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  NewResource,
  Resource,
  ResourceId,
  ResourceOfType,
  ResourceType,
} from '../../../shared/models';
import { ResourceApi, ResourceQuery } from '../resource-api';
import { API_BASE_URL, ApiError, request } from './http-api.utils';

/** Implémentation de `ResourceApi` sur l'API REST. */
@Injectable()
export class HttpResourceApi extends ResourceApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/resources`;

  override list<T extends ResourceType>(q: ResourceQuery<T>) {
    let params = new HttpParams().set('type', q.type);
    if (q.audience) params = params.set('audience', q.audience);
    if (q.ownerRole) params = params.set('ownerRole', q.ownerRole);
    if (q.ownerId) params = params.set('ownerId', q.ownerId);
    return request(this.http.get<ResourceOfType<T>[]>(this.base, { params }));
  }

  override async get(id: ResourceId) {
    try {
      return await request(this.http.get<Resource>(`${this.base}/${encodeURIComponent(id)}`));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  }

  /** Le propriétaire est déduit de la session côté serveur. */
  override create(input: NewResource) {
    return request(this.http.post<Resource>(this.base, input));
  }
}
