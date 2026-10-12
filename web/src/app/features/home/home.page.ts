import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Page provisoire : sera développée après validation de l'architecture. */
@Component({
  selector: 'app-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h1 class="p-4 text-xl font-semibold">Accueil : choisir son espace</h1>`,
})
export default class HomePage {}
