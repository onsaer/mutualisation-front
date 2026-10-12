import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { PhotoApi, ResourceApi } from '../../core/api';
import { AuthStore } from '../../core/auth/auth.store';
import { MockPhotoApi, MockResourceApi } from '../../core/api/mock/mock-apis';
import { DEMO_PARTICULIER_USER } from '../../core/api/mock/mock-data';
import PublishPage from './publish.page';

const wait = (ms = 0) => new Promise((r) => setTimeout(r, ms));

const type = (el: HTMLInputElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event('input'));
};

describe('PublishPage', () => {
  it("bloque l'envoi d'un formulaire invalide puis publie une annonce valide", async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ResourceApi, useClass: MockResourceApi },
        { provide: PhotoApi, useClass: MockPhotoApi },
      ],
    });
    TestBed.inject(AuthStore).setUser(DEMO_PARTICULIER_USER);
    const api = TestBed.inject(ResourceApi);
    const create = vi.spyOn(api, 'create');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    const fixture = TestBed.createComponent(PublishPage);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const form = el.querySelector('form')!;

    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await wait();
    await fixture.whenStable();
    expect(create).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Donnez un titre à votre annonce.');

    type(el.querySelector('input[placeholder="Perceuse-visseuse sans fil"]')!, 'Scie sauteuse');
    type(el.querySelector('input[placeholder="bricolage"]')!, 'Bricolage');
    await fixture.whenStable();

    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await wait(400);
    await fixture.whenStable();

    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0]![0]).toMatchObject({
      type: 'materiel',
      title: 'Scie sauteuse',
      category: 'bricolage',
      pricing: { mode: 'gratuit' },
      audience: ['particulier'],
    });
    expect(navigate).toHaveBeenCalledWith('/particulier/outils');
  });
});
