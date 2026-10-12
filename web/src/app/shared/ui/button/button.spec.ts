import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Button } from './button';

@Component({
  imports: [Button],
  template: `
    <button appButton variant="danger" [loading]="loading()">Supprimer</button>
    <a appButton href="/x" [disabled]="true">Lien</a>
  `,
})
class Host {
  readonly loading = signal(false);
}

describe('Button', () => {
  it('applique la variante et désactive le bouton pendant le chargement', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(button.className).toContain('bg-red-600');
    expect(button.disabled).toBe(false);

    fixture.componentInstance.loading.set(true);
    await fixture.whenStable();
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
  });

  it('utilise aria-disabled sur un lien', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a')!;
    expect(link.getAttribute('aria-disabled')).toBe('true');
    expect(link.hasAttribute('disabled')).toBe(false);
  });
});
