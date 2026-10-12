import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, form, submit } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { Button, FieldErrors } from '../../../shared/ui';
import { regionFromPostalCode } from '../../../shared/utils/belgium';
import { emptyRegistration, registrationSchema, toRegistration } from '../registration-draft';

const INPUT =
  'mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base outline-none ' +
  'focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 ' +
  'aria-[invalid=true]:border-red-500';
const LABEL = 'block text-sm font-medium text-slate-700';
const SECTION = 'space-y-4 rounded-2xl border border-slate-200 bg-white p-4';

/**
 * Inscription, après la première connexion : la personne choisit son espace et complète
 * son profil. L'e-mail (et le nom, avec itsme) viennent du fournisseur d'identité.
 */
@Component({
  selector: 'app-registration-page',
  imports: [FormField, FieldErrors, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-lg p-4">
      <h1 class="text-2xl font-semibold">Bienvenue !</h1>
      <p class="mb-4 text-sm text-slate-500">
        Complétez votre profil pour commencer.
        @if (identity?.email; as email) {
          Vous êtes connecté avec <strong>{{ email }}</strong
          >.
        }
      </p>
      @if (identity?.verified) {
        <p class="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
          Identité vérifiée par itsme.
        </p>
      }

      <form class="space-y-4" novalidate (submit)="save($event)">
        <fieldset class="grid grid-cols-2 gap-2">
          <legend class="mb-2 text-sm font-medium text-slate-700">Vous êtes</legend>
          @for (r of roles; track r.value) {
            <label
              class="flex cursor-pointer flex-col rounded-2xl border border-slate-300 bg-white p-3 text-center has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-600"
            >
              <input type="radio" class="sr-only" [formField]="f.role" [value]="r.value" />
              <span class="text-sm font-semibold">{{ r.label }}</span>
              <span class="text-xs text-slate-500">{{ r.hint }}</span>
            </label>
          }
        </fieldset>

        <section [class]="section" aria-labelledby="s-qui">
          @if (role() === 'pro') {
            <h2 id="s-qui" class="font-semibold">Votre entreprise</h2>
            <label [class]="label">
              Dénomination
              <input [class]="input" [formField]="f.legalName" autocomplete="organization" />
              <app-field-errors [field]="f.legalName" />
            </label>
            <div class="grid grid-cols-2 gap-3">
              <label [class]="label">
                Numéro d'entreprise
                <input [class]="input" [formField]="f.vatNumber" placeholder="BE0123456789" />
                <app-field-errors [field]="f.vatNumber" />
              </label>
              <label [class]="label">
                Taille
                <select [class]="input" [formField]="f.companySize">
                  <option value="tpe">TPE</option>
                  <option value="pme">PME</option>
                  <option value="commercant">Commerce</option>
                </select>
              </label>
            </div>
          } @else {
            <h2 id="s-qui" class="font-semibold">Vous</h2>
            <div class="grid grid-cols-2 gap-3">
              <label [class]="label">
                Prénom
                <input [class]="input" [formField]="f.firstName" autocomplete="given-name" />
                <app-field-errors [field]="f.firstName" />
              </label>
              <label [class]="label">
                Nom
                <input [class]="input" [formField]="f.lastName" autocomplete="family-name" />
                <app-field-errors [field]="f.lastName" />
              </label>
            </div>
          }
          <label [class]="label">
            Nom affiché <span class="font-normal text-slate-400">(facultatif)</span>
            <input [class]="input" [formField]="f.displayName" [placeholder]="displayNameHint()" />
          </label>
          <label [class]="label">
            Téléphone <span class="font-normal text-slate-400">(facultatif)</span>
            <input
              [class]="input"
              type="tel"
              [formField]="f.phone"
              placeholder="+32470123456"
              autocomplete="tel"
            />
            <app-field-errors [field]="f.phone" />
          </label>
        </section>

        <section [class]="section" aria-labelledby="s-adresse">
          <h2 id="s-adresse" class="font-semibold">Adresse</h2>
          <p class="-mt-2 text-xs text-slate-500">
            Elle sert à vous proposer des annonces proches. Elle n'est pas affichée publiquement.
          </p>
          <div class="grid grid-cols-[1fr_6rem] gap-3">
            <label [class]="label">
              Rue
              <input [class]="input" [formField]="f.street" autocomplete="address-line1" />
              <app-field-errors [field]="f.street" />
            </label>
            <label [class]="label">
              Numéro
              <input [class]="input" [formField]="f.number" />
              <app-field-errors [field]="f.number" />
            </label>
          </div>
          <div class="grid grid-cols-[7rem_1fr] gap-3">
            <label [class]="label">
              Code postal
              <input
                [class]="input"
                [formField]="f.postalCode"
                inputmode="numeric"
                autocomplete="postal-code"
              />
              <app-field-errors [field]="f.postalCode" />
            </label>
            <label [class]="label">
              Commune
              <input [class]="input" [formField]="f.municipality" autocomplete="address-level2" />
              <app-field-errors [field]="f.municipality" />
            </label>
          </div>
          @if (region()) {
            <p class="text-xs text-slate-500">Région : {{ region() }}</p>
          }
        </section>

        @if (serverError()) {
          <p role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-800">
            {{ serverError() }}
          </p>
        } @else if (f().touched() && f().invalid()) {
          <p role="alert" class="text-sm text-red-700">Corrigez les champs signalés en rouge.</p>
        }

        <button appButton type="submit" size="lg" [fullWidth]="true" [loading]="f().submitting()">
          Créer mon profil
        </button>
      </form>
    </section>
  `,
})
export default class RegistrationPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly input = INPUT;
  protected readonly label = LABEL;
  protected readonly section = SECTION;
  protected readonly roles = [
    { value: 'particulier', label: 'Particulier', hint: 'Prêter, stocker, acheter entre voisins' },
    { value: 'pro', label: 'Professionnel', hint: 'TPE, PME, commerce' },
  ] as const;

  protected readonly identity = this.auth.identity();
  protected readonly draft = signal(emptyRegistration(this.identity));
  protected readonly f = form(this.draft, registrationSchema);

  protected readonly role = computed(() => this.draft().role);
  protected readonly region = computed(() => {
    const r = regionFromPostalCode(this.draft().postalCode);
    return r && { bruxelles: 'Bruxelles-Capitale', wallonie: 'Wallonie', flandre: 'Flandre' }[r];
  });
  protected readonly displayNameHint = computed(() => {
    const d = this.draft();
    return d.role === 'pro'
      ? d.legalName || 'Nom de votre entreprise'
      : d.firstName
        ? `${d.firstName} ${d.lastName.charAt(0)}.`
        : 'Prénom et initiale';
  });
  protected readonly serverError = signal<string | null>(null);

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    this.serverError.set(null);
    await submit(this.f, async () => {
      try {
        const home = await this.auth.register(toRegistration(this.draft()));
        await this.router.navigateByUrl(home, { replaceUrl: true });
      } catch (e) {
        this.serverError.set(e instanceof Error ? e.message : 'L’inscription a échoué. Réessayez.');
      }
      return undefined;
    });
  }
}
