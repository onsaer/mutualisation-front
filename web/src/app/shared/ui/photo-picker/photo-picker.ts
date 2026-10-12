import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { PhotoApi } from '../../../core/api/photo-api';
import { downscale } from '../../utils/image';

interface Pending {
  readonly id: number;
  readonly preview: string;
  readonly error?: string;
}

const ACCEPT = 'image/jpeg,image/png,image/webp';

/**
 * Ajout de photos : choix dans la galerie ou prise de vue sur mobile, aperçu, envoi immédiat,
 * suppression et choix de la photo de couverture (la première).
 *
 * @example
 * <app-photo-picker [(urls)]="photos" [(uploading)]="busy" />
 */
@Component({
  selector: 'app-photo-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="grid grid-cols-3 gap-2" aria-label="Photos de l'annonce">
      @for (url of urls(); track url; let first = $first) {
        <li class="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
          <img [src]="url" alt="" class="size-full object-cover" />
          @if (first) {
            <span
              class="absolute left-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white"
              >Couverture</span
            >
          } @else {
            <button
              type="button"
              class="absolute bottom-1 left-1 rounded-full bg-white/90 px-2 py-0.5 text-xs"
              (click)="makeCover(url)"
            >
              Couverture
            </button>
          }
          <button
            type="button"
            class="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-white/90 text-slate-700"
            [attr.aria-label]="'Retirer la photo ' + ($index + 1)"
            (click)="remove(url)"
          >
            ✕&#xFE0E;
          </button>
        </li>
      }
      @for (p of pending(); track p.id) {
        <li class="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
          <img [src]="p.preview" alt="" class="size-full object-cover opacity-50" />
          @if (p.error) {
            <div
              class="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red-50/90 p-2 text-center"
            >
              <p class="text-xs text-red-800">{{ p.error }}</p>
              <button type="button" class="text-xs underline" (click)="dismiss(p)">Fermer</button>
            </div>
          } @else {
            <p
              class="absolute inset-0 grid place-items-center text-xs font-medium text-slate-700"
              role="status"
            >
              Envoi…
            </p>
          }
        </li>
      }
      @if (remaining() > 0) {
        <li>
          <label
            class="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 text-sm text-slate-600 hover:bg-slate-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-600"
          >
            <span class="text-2xl leading-none" aria-hidden="true">+</span>
            Ajouter
            <input type="file" class="sr-only" [accept]="accept" multiple (change)="add($event)" />
          </label>
        </li>
      }
    </ul>
    <p class="mt-2 text-xs text-slate-500">
      {{ max() }} photos maximum. La première sert de couverture. La position GPS des photos est
      retirée.
    </p>
  `,
})
export class PhotoPicker {
  private readonly api = inject(PhotoApi);

  /** Adresses des photos envoyées, dans l'ordre d'affichage. */
  readonly urls = model<readonly string[]>([]);
  /** Vrai pendant un envoi (le formulaire attend avant de publier). */
  readonly uploading = model(false);
  readonly max = input(10);

  protected readonly accept = ACCEPT;
  protected readonly pending = signal<readonly Pending[]>([]);
  protected readonly remaining = computed(
    () => this.max() - this.urls().length - this.pending().length,
  );
  private nextId = 0;

  protected add(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = [...(input.files ?? [])].slice(0, Math.max(0, this.remaining()));
    input.value = '';
    const items = files.map((file) => ({ id: this.nextId++, preview: URL.createObjectURL(file) }));
    this.pending.update((list) => [...list, ...items]);
    void this.uploadInOrder(files, items);
  }

  protected remove(url: string): void {
    this.urls.update((list) => list.filter((u) => u !== url));
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
  }

  protected makeCover(url: string): void {
    this.urls.update((list) => [url, ...list.filter((u) => u !== url)]);
  }

  protected dismiss(p: Pending): void {
    URL.revokeObjectURL(p.preview);
    this.pending.update((list) => list.filter((x) => x.id !== p.id));
  }

  /** Une photo après l'autre, pour garder l'ordre choisi (la première reste la couverture). */
  private async uploadInOrder(files: File[], items: Pending[]): Promise<void> {
    this.uploading.set(true);
    for (const [i, file] of files.entries()) {
      const item = items[i]!;
      try {
        if (!ACCEPT.split(',').includes(file.type)) {
          throw new Error('Format non pris en charge (JPEG, PNG ou WebP).');
        }
        const url = await this.api.upload(await downscale(file));
        this.urls.update((list) => [...list, url]);
        this.dismiss(item);
      } catch (e) {
        const error = e instanceof Error ? e.message : 'Envoi impossible.';
        this.pending.update((list) => list.map((x) => (x.id === item.id ? { ...x, error } : x)));
      }
    }
    this.uploading.set(this.pending().some((x) => !x.error));
  }
}
