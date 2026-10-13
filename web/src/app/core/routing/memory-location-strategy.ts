import { LocationChangeListener, LocationStrategy } from '@angular/common';
import { Injectable } from '@angular/core';

/**
 * Navigation gardée en mémoire, sans toucher à l'historique du navigateur. Utilisée par la démo
 * en ligne, affichée dans un cadre isolé où `history.pushState` est interdit. Le retour arrière
 * de l'application fonctionne ; l'adresse de la page ne change pas.
 */
@Injectable()
export class MemoryLocationStrategy extends LocationStrategy {
  private readonly stack: { url: string; state: unknown }[] = [{ url: '', state: null }];
  private readonly listeners: LocationChangeListener[] = [];

  override path(): string {
    return this.stack.at(-1)!.url;
  }

  override prepareExternalUrl(internal: string): string {
    return internal;
  }

  override getState(): unknown {
    return this.stack.at(-1)!.state;
  }

  override pushState(state: unknown, _title: string, path: string, query: string): void {
    this.stack.push({ url: join(path, query), state });
  }

  override replaceState(state: unknown, _title: string, path: string, query: string): void {
    this.stack[this.stack.length - 1] = { url: join(path, query), state };
  }

  override forward(): void {
    // Pas d'historique « suivant » en mémoire.
  }

  override back(): void {
    if (this.stack.length < 2) return;
    this.stack.pop();
    const { state } = this.stack.at(-1)!;
    for (const fn of this.listeners) fn({ type: 'popstate', state });
  }

  override onPopState(fn: LocationChangeListener): void {
    this.listeners.push(fn);
  }

  override getBaseHref(): string {
    return '';
  }
}

const join = (path: string, query: string) => (query ? `${path}?${query}` : path);
