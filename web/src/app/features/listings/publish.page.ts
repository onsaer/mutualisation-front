import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, form, submit } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { ResourceApi } from '../../core/api';
import { AuthStore } from '../../core/auth/auth.store';
import { EspaceKind, Pricing, ResourceType, UserRole } from '../../shared/models';
import { Button, FieldErrors } from '../../shared/ui';
import { regionFromPostalCode } from '../../shared/utils/belgium';
import { emptyDraft, listingSchema, toNewResource } from './listing-draft';

const TYPES: readonly { value: ResourceType; label: string; hint: string }[] = [
  { value: 'materiel', label: 'Matériel', hint: 'Outil, machine, équipement' },
  { value: 'espace', label: 'Espace', hint: 'Stockage, bureau, garage' },
  { value: 'achat_groupe', label: 'Achat groupé', hint: 'Commander à plusieurs' },
];

const PRICING_MODES: readonly { value: Pricing['mode']; label: string }[] = [
  { value: 'gratuit', label: 'Gratuit (prêt)' },
  { value: 'par_heure', label: 'Par heure' },
  { value: 'par_jour', label: 'Par jour' },
  { value: 'par_weekend', label: 'Par week-end' },
  { value: 'par_mois', label: 'Par mois' },
];

const ESPACE_KINDS: Record<UserRole, readonly { value: EspaceKind; label: string }[]> = {
  pro: [
    { value: 'stockage', label: 'Stockage / box' },
    { value: 'bureau', label: 'Bureau' },
    { value: 'atelier', label: 'Atelier' },
    { value: 'entrepot', label: 'Entrepôt' },
  ],
  particulier: [
    { value: 'cave_garage', label: 'Cave ou garage' },
    { value: 'stockage', label: 'Box de stockage' },
  ],
};

/** Page de retour après publication, selon l'espace et le type d'annonce. */
const LIST_PATHS: Record<UserRole, Record<ResourceType, string>> = {
  pro: { materiel: '/pro/materiel', espace: '/pro/espaces', achat_groupe: '/pro/achats-groupes' },
  particulier: {
    materiel: '/particulier/outils',
    espace: '/particulier/co-stockage',
    achat_groupe: '/particulier/achats-quartier',
  },
};

const INPUT =
  'mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base outline-none ' +
  'focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 ' +
  'aria-[invalid=true]:border-red-500';
const LABEL = 'block text-sm font-medium text-slate-700';
const SECTION = 'space-y-4 rounded-2xl border border-slate-200 bg-white p-4';

/**
 * Publication d'une annonce, commune aux espaces Pro et Particulier
 * (`/pro/publier`, `/particulier/publier`, `?type=materiel|espace|achat_groupe`).
 * Formulaire construit avec Signal Forms : le modèle est un `signal`, la validation un `schema`.
 */
@Component({
  selector: 'app-publish-page',
  imports: [FormField, FieldErrors, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="text-2xl font-semibold">Publier une annonce</h1>
    <p class="mb-4 text-sm text-slate-500">
      Quelques informations suffisent, vous pourrez la modifier ensuite.
    </p>

    <form class="space-y-4" novalidate (submit)="publish($event)">
      <fieldset class="grid grid-cols-3 gap-2">
        <legend class="sr-only">Type d'annonce</legend>
        @for (t of types; track t.value) {
          <label
            class="flex cursor-pointer flex-col rounded-2xl border border-slate-300 bg-white p-3 text-center has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-600"
          >
            <input type="radio" class="sr-only" [formField]="f.type" [value]="t.value" />
            <span class="text-sm font-semibold">{{ t.label }}</span>
            <span class="text-xs text-slate-500">{{ t.hint }}</span>
          </label>
        }
      </fieldset>

      <section [class]="section" aria-labelledby="s-infos">
        <h2 id="s-infos" class="font-semibold">Description</h2>
        <label [class]="label">
          Titre
          <input [class]="input" [formField]="f.title" placeholder="{{ titlePlaceholder() }}" />
          <app-field-errors [field]="f.title" />
        </label>
        <label [class]="label">
          Détails <span class="font-normal text-slate-400">(facultatif)</span>
          <textarea [class]="input + ' h-28 py-2'" [formField]="f.description"></textarea>
          <app-field-errors [field]="f.description" />
        </label>

        @switch (type()) {
          @case ('materiel') {
            <div class="grid grid-cols-2 gap-3">
              <label [class]="label">
                Catégorie
                <input [class]="input" [formField]="f.category" placeholder="bricolage" />
                <app-field-errors [field]="f.category" />
              </label>
              <label [class]="label">
                État
                <select [class]="input" [formField]="f.condition">
                  <option value="neuf">Neuf</option>
                  <option value="tres_bon">Très bon</option>
                  <option value="bon">Bon</option>
                  <option value="use">Usé</option>
                </select>
              </label>
            </div>
            <label class="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                class="size-5 accent-emerald-600"
                [formField]="f.weekendOnly"
              />
              Disponible uniquement le week-end
            </label>
          }
          @case ('espace') {
            <div class="grid grid-cols-2 gap-3">
              <label [class]="label">
                Type d'espace
                <select [class]="input" [formField]="f.espaceKind">
                  @for (k of espaceKinds(); track k.value) {
                    <option [value]="k.value">{{ k.label }}</option>
                  }
                </select>
              </label>
              <label [class]="label">
                Surface (m²)
                <input
                  type="number"
                  inputmode="decimal"
                  [class]="input"
                  [formField]="f.surfaceM2"
                />
                <app-field-errors [field]="f.surfaceM2" />
              </label>
            </div>
            <label [class]="label">
              Accès
              <select [class]="input" [formField]="f.access">
                <option value="libre">Libre</option>
                <option value="sur_rendez_vous">Sur rendez-vous</option>
                <option value="badge">Badge ou code</option>
              </select>
            </label>
          }
          @case ('achat_groupe') {
            <div class="grid grid-cols-2 gap-3">
              <label [class]="label">
                Produit
                <input
                  [class]="input"
                  [formField]="f.productName"
                  placeholder="Bois de chauffage"
                />
                <app-field-errors [field]="f.productName" />
              </label>
              <label [class]="label">
                Unité
                <input [class]="input" [formField]="f.unit" placeholder="stère" />
                <app-field-errors [field]="f.unit" />
              </label>
              <label [class]="label">
                Prix unitaire (€)
                <input
                  type="number"
                  inputmode="decimal"
                  step="0.01"
                  [class]="input"
                  [formField]="f.unitPriceEuros"
                />
                <app-field-errors [field]="f.unitPriceEuros" />
              </label>
              <label [class]="label">
                Clôture
                <input type="date" [class]="input" [formField]="f.deadline" />
                <app-field-errors [field]="f.deadline" />
              </label>
              <label [class]="label">
                Seuil de commande
                <input
                  type="number"
                  inputmode="numeric"
                  [class]="input"
                  [formField]="f.minQuantity"
                />
                <app-field-errors [field]="f.minQuantity" />
              </label>
              <label [class]="label">
                Maximum <span class="font-normal text-slate-400">(facultatif)</span>
                <input
                  type="number"
                  inputmode="numeric"
                  [class]="input"
                  [formField]="f.maxQuantity"
                />
                <app-field-errors [field]="f.maxQuantity" />
              </label>
            </div>
          }
        }
      </section>

      @if (type() !== 'achat_groupe') {
        <section [class]="section" aria-labelledby="s-prix">
          <h2 id="s-prix" class="font-semibold">Tarif</h2>
          <label [class]="label">
            Formule
            <select [class]="input" [formField]="f.pricingMode">
              @for (m of pricingModes; track m.value) {
                <option [value]="m.value">{{ m.label }}</option>
              }
            </select>
          </label>
          @if (draft().pricingMode !== 'gratuit') {
            <div class="grid grid-cols-2 gap-3">
              <label [class]="label">
                Prix (€)
                <input
                  type="number"
                  inputmode="decimal"
                  step="0.5"
                  [class]="input"
                  [formField]="f.priceEuros"
                />
                <app-field-errors [field]="f.priceEuros" />
              </label>
              <label [class]="label">
                Caution (€) <span class="font-normal text-slate-400">(facultatif)</span>
                <input
                  type="number"
                  inputmode="decimal"
                  [class]="input"
                  [formField]="f.depositEuros"
                />
                <app-field-errors [field]="f.depositEuros" />
              </label>
            </div>
          }
        </section>
      }

      <section [class]="section" aria-labelledby="s-lieu">
        <h2 id="s-lieu" class="font-semibold">Lieu</h2>
        <div class="grid grid-cols-[1fr_5rem] gap-3">
          <label [class]="label">
            Rue
            <input [class]="input" [formField]="f.street" autocomplete="address-line1" />
            <app-field-errors [field]="f.street" />
          </label>
          <label [class]="label">
            N°
            <input [class]="input" [formField]="f.number" />
          </label>
        </div>
        <div class="grid grid-cols-[6rem_1fr] gap-3">
          <label [class]="label">
            Code postal
            <input
              inputmode="numeric"
              [class]="input"
              [formField]="f.postalCode"
              autocomplete="postal-code"
            />
          </label>
          <label [class]="label">
            Commune
            <input [class]="input" [formField]="f.municipality" autocomplete="address-level2" />
          </label>
        </div>
        <app-field-errors [field]="f.postalCode" />
        <app-field-errors [field]="f.municipality" />
        @if (region(); as r) {
          <p class="text-xs text-slate-500">Région : {{ r }}</p>
        }
      </section>

      <section [class]="section" aria-labelledby="s-public">
        <h2 id="s-public" class="font-semibold">Qui peut réserver ?</h2>
        <label class="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            class="size-5 accent-emerald-600"
            [formField]="f.audienceParticulier"
          />
          Les particuliers
        </label>
        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" class="size-5 accent-emerald-600" [formField]="f.audiencePro" />
          Les professionnels
        </label>
        <app-field-errors [field]="f.audienceParticulier" />
      </section>

      @if (serverError()) {
        <p role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {{ serverError() }}
        </p>
      } @else if (f().touched() && f().invalid()) {
        <p role="alert" class="text-sm text-red-700">Corrigez les champs signalés en rouge.</p>
      }

      <button appButton type="submit" size="lg" [fullWidth]="true" [loading]="f().submitting()">
        Publier l'annonce
      </button>
    </form>
  `,
})
export default class PublishPage {
  private readonly api = inject(ResourceApi);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly types = TYPES;
  protected readonly pricingModes = PRICING_MODES;
  protected readonly input = INPUT;
  protected readonly label = LABEL;
  protected readonly section = SECTION;

  private readonly role = computed<UserRole>(() => this.auth.user()?.role ?? 'particulier');

  /** Modèle du formulaire : un simple signal, source de vérité unique. */
  protected readonly draft = signal(
    emptyDraft(this.auth.user(), toType(inject(ActivatedRoute).snapshot.queryParamMap.get('type'))),
  );
  protected readonly f = form(this.draft, listingSchema);

  protected readonly type = computed(() => this.draft().type);
  protected readonly espaceKinds = computed(() => ESPACE_KINDS[this.role()]);
  protected readonly region = computed(() => {
    const r = regionFromPostalCode(this.draft().postalCode);
    return r && { bruxelles: 'Bruxelles-Capitale', wallonie: 'Wallonie', flandre: 'Flandre' }[r];
  });
  protected readonly titlePlaceholder = computed(
    () =>
      ({
        materiel: 'Perceuse-visseuse sans fil',
        espace: 'Box de stockage 10 m²',
        achat_groupe: 'Bois de chauffage sec',
      })[this.type()],
  );
  protected readonly serverError = signal<string | null>(null);

  protected async publish(event: Event): Promise<void> {
    event.preventDefault();
    this.serverError.set(null);
    await submit(this.f, async () => {
      const user = this.auth.user();
      if (!user) return { kind: 'auth', message: 'Session expirée.' };
      try {
        await this.api.create(toNewResource(this.draft()), user);
      } catch {
        this.serverError.set('La publication a échoué. Vérifiez votre connexion et réessayez.');
        return undefined;
      }
      await this.router.navigateByUrl(LIST_PATHS[user.role][this.draft().type]);
      return undefined;
    });
  }
}

const toType = (value: string | null): ResourceType =>
  value === 'espace' || value === 'achat_groupe' ? value : 'materiel';
