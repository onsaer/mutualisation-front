import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthStore } from '../../core/auth/auth.store';
import { NavItem, SpaceShell } from '../../core/layout/space-shell';

const NAV: readonly NavItem[] = [
  { path: '/particulier', label: 'Accueil', icon: '⌂', exact: true },
  { path: '/particulier/outils', label: 'Outils', icon: '⚒︎', exact: false },
  { path: '/particulier/co-stockage', label: 'Stockage', icon: '▦', exact: false },
  { path: '/particulier/achats-quartier', label: 'Quartier', icon: '⛁︎', exact: false },
  { path: '/particulier/location-weekend', label: 'Week-end', icon: '☀︎', exact: false },
];

/** Coquille de l'espace B2C. */
@Component({
  selector: 'app-particulier-layout',
  imports: [SpaceShell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-space-shell
      spaceLabel="Particulier"
      homePath="/particulier"
      [nav]="nav"
      [account]="account()"
    />
  `,
})
export class ParticulierLayout {
  private readonly auth = inject(AuthStore);
  protected readonly nav = NAV;
  protected readonly account = computed(() => this.auth.user()?.displayName ?? '');
}
