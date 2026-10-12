import { DateRange, IsoDate, IsoDateTime } from '../models';
import { isFreeDuring, upcomingWeekend } from './weekend';

describe('weekend', () => {
  it('trouve le prochain week-end depuis un mercredi', () => {
    expect(upcomingWeekend(new Date(2026, 9, 14))).toEqual({
      start: '2026-10-17',
      end: '2026-10-18',
    });
  });

  it('garde le week-end en cours un samedi ou un dimanche', () => {
    expect(upcomingWeekend(new Date(2026, 9, 17))).toEqual({
      start: '2026-10-17',
      end: '2026-10-18',
    });
    expect(upcomingWeekend(new Date(2026, 9, 18))).toEqual({
      start: '2026-10-18',
      end: '2026-10-18',
    });
  });

  it('détecte une indisponibilité pendant le week-end', () => {
    const weekend = { start: '2026-10-17' as IsoDate, end: '2026-10-18' as IsoDate };
    const busy: DateRange[] = [
      { start: '2026-10-18T09:00:00' as IsoDateTime, end: '2026-10-18T18:00:00' as IsoDateTime },
    ];
    expect(isFreeDuring([], weekend)).toBe(true);
    expect(isFreeDuring(busy, weekend)).toBe(false);
  });
});
