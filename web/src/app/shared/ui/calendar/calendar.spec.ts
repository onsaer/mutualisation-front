import { TestBed } from '@angular/core/testing';
import { IsoDate } from '../../models';
import { Calendar } from './calendar';

describe('Calendar', () => {
  it('ne rend sélectionnables que les week-ends en mode weekendOnly', async () => {
    const fixture = TestBed.createComponent(Calendar);
    fixture.componentRef.setInput('weekendOnly', true);
    fixture.componentRef.setInput('minDate', '2000-01-01' as IsoDate);
    await fixture.whenStable();

    const enabled = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        '[role=gridcell] button:not([disabled])',
      ),
    ];
    expect(enabled.length).toBeGreaterThan(0);
    for (const b of enabled) {
      expect(b.getAttribute('aria-label')).toMatch(/^(samedi|dimanche)/);
    }
  });

  it('met à jour la sélection au clic', async () => {
    const fixture = TestBed.createComponent(Calendar);
    fixture.componentRef.setInput('minDate', '2000-01-01' as IsoDate);
    await fixture.whenStable();
    const first = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '[role=gridcell] button',
    )!;
    first.click();
    await fixture.whenStable();
    const s = fixture.componentInstance.selection();
    expect(s).not.toBeNull();
    expect(s!.start).toBe(s!.end);
    expect(first.getAttribute('aria-pressed')).toBe('true');
  });
});
