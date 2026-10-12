import { Injectable, computed, signal } from '@angular/core';

/** Événement non standard émis par Chromium avant l'installation d'une PWA. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Capture `beforeinstallprompt` pour proposer l'installation au bon moment. */
@Injectable({ providedIn: 'root' })
export class InstallPromptService {
  private readonly deferred = signal<BeforeInstallPromptEvent | null>(null);
  readonly canInstall = computed(() => this.deferred() !== null);

  constructor() {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferred.set(event as BeforeInstallPromptEvent);
    });
  }

  async promptInstall(): Promise<boolean> {
    const event = this.deferred();
    if (!event) return false;
    await event.prompt();
    const { outcome } = await event.userChoice;
    this.deferred.set(null);
    return outcome === 'accepted';
  }
}
