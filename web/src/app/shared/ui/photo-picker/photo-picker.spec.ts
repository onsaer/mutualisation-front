import { TestBed } from '@angular/core/testing';
import { PhotoApi } from '../../../core/api/photo-api';
import { PhotoPicker } from './photo-picker';

class FakePhotoApi extends PhotoApi {
  sent = 0;
  override async upload() {
    return `/api/photos/photo-${++this.sent}.webp`;
  }
}

const settle = () => new Promise((r) => setTimeout(r));

describe('PhotoPicker', () => {
  let api: FakePhotoApi;

  beforeEach(() => {
    URL.createObjectURL = () => 'blob:apercu';
    URL.revokeObjectURL = () => undefined;
    api = new FakePhotoApi();
    TestBed.configureTestingModule({ providers: [{ provide: PhotoApi, useValue: api }] });
  });

  const choose = (el: HTMLElement, ...files: File[]) => {
    const input = el.querySelector<HTMLInputElement>('input[type=file]')!;
    Object.defineProperty(input, 'files', { value: files, configurable: true });
    input.dispatchEvent(new Event('change'));
  };

  it('envoie les photos choisies, permet de changer la couverture et de retirer', async () => {
    const fixture = TestBed.createComponent(PhotoPicker);
    const el: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();

    choose(
      el,
      new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
      new File(['b'], 'b.png', { type: 'image/png' }),
    );
    await settle();
    await fixture.whenStable();
    const picker = fixture.componentInstance;
    expect(picker.urls()).toEqual(['/api/photos/photo-1.webp', '/api/photos/photo-2.webp']);
    expect(picker.uploading()).toBe(false);

    el.querySelector<HTMLButtonElement>('li:nth-child(2) button')!.click();
    expect(picker.urls()[0]).toBe('/api/photos/photo-2.webp');
    await fixture.whenStable();

    el.querySelector<HTMLButtonElement>('[aria-label="Retirer la photo 1"]')!.click();
    expect(picker.urls()).toEqual(['/api/photos/photo-1.webp']);
  });

  it('refuse un format non pris en charge et respecte le nombre maximum', async () => {
    const fixture = TestBed.createComponent(PhotoPicker);
    fixture.componentRef.setInput('max', 1);
    const el: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();

    choose(el, new File(['%PDF'], 'facture.pdf', { type: 'application/pdf' }));
    await settle();
    await fixture.whenStable();
    expect(el.textContent).toContain('Format non pris en charge');
    expect(api.sent).toBe(0);
    expect(el.querySelector('input[type=file]')).toBeNull();
  });
});
