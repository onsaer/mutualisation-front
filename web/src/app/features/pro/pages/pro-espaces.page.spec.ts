import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ResourceApi } from '../../../core/api';
import { MockResourceApi } from '../../../core/api/mock/mock-apis';
import ProEspacesPage from './pro-espaces.page';

describe('ProEspacesPage', () => {
  it('filtre les espaces par type et par recherche', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ResourceApi, useClass: MockResourceApi }],
    });
    const fixture = TestBed.createComponent(ProEspacesPage);
    await new Promise((r) => setTimeout(r, 400));
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const cards = () => el.querySelectorAll('app-resource-card').length;

    expect(cards()).toBe(3);

    [...el.querySelectorAll<HTMLButtonElement>('app-filter-chips button')]
      .find((b) => b.textContent?.includes('Bureaux'))!
      .click();
    await fixture.whenStable();
    expect(cards()).toBe(1);

    const input = el.querySelector<HTMLInputElement>('input[type=search]')!;
    input.value = 'anvers';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(el.textContent).toContain('Aucune annonce');
  });
});
