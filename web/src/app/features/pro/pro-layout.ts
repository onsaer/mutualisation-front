import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthStore } from '../../core/auth/auth.store';
import { NavItem, SpaceShell } from '../../core/layout/space-shell';
import { isProUser } from '../../shared/models';

const NAV: readonly NavItem[] = [
  { path: '/pro', label: 'Accueil', icon: '⌂', exact: true },
  { path: '/pro/espaces', label: 'Espaces', icon: '▦', exact: false },
  { path: '/pro/materiel', label: 'Matériel', icon: '⚒︎', exact: false },
  { path: '/pro/achats-groupes', label: 'Achats', icon: '⛁︎', exact: false },
];

/** Coquille de l'espace B2B. */
@Component({
  selector: 'app-pro-layout',
  imports: [SpaceShell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-space-shell
    spaceLabel="Pro"
    homePath="/pro"
    [nav]="nav"
    [account]="account()"
  />`,
})
export class ProLayout {
  private readonly auth = inject(AuthStore);
  protected readonly nav = NAV;

  protected readonly account = computed(() => {
    const user = this.auth.user();
    return user && isProUser(user) ? user.company.legalName : '';
  });
}
