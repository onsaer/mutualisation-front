import { DateRange, IsoDate, IsoDateTime } from '../../models';
import { buildMonthGrid, isInRanges, isWeekend, nextSelection } from './calendar.utils';

const d = (s: string) => s as IsoDate;

describe('calendar.utils', () => {
  it('construit une grille commençant le lundi', () => {
    // Octobre 2026 commence un jeudi.
    const grid = buildMonthGrid(2026, 9);
    expect(grid[0]![0]!.date).toBe('2026-09-28');
    expect(grid[0]![3]!).toEqual({ date: '2026-10-01', inMonth: true, isWeekend: false });
    expect(grid.flat().filter((day) => day.inMonth)).toHaveLength(31);
  });

  it('détecte les week-ends', () => {
    expect(isWeekend(d('2026-10-17'))).toBe(true);
    expect(isWeekend(d('2026-10-19'))).toBe(false);
  });

  it('détecte un jour dans une période indisponible', () => {
    const ranges: DateRange[] = [
      { start: '2026-10-10T08:00:00' as IsoDateTime, end: '2026-10-12T18:00:00' as IsoDateTime },
    ];
    expect(isInRanges(d('2026-10-11'), ranges)).toBe(true);
    expect(isInRanges(d('2026-10-13'), ranges)).toBe(false);
  });

  it('étend la sélection puis recommence', () => {
    const never = () => false;
    const one = nextSelection(null, d('2026-10-17'), never);
    expect(one).toEqual({ start: '2026-10-17', end: '2026-10-17' });
    const range = nextSelection(one, d('2026-10-18'), never);
    expect(range).toEqual({ start: '2026-10-17', end: '2026-10-18' });
    expect(nextSelection(range, d('2026-10-20'), never)).toEqual({
      start: '2026-10-20',
      end: '2026-10-20',
    });
  });

  it("refuse d'étendre par-dessus un jour bloqué", () => {
    const blocked = (day: IsoDate) => day === '2026-10-15';
    const one = nextSelection(null, d('2026-10-14'), blocked);
    expect(nextSelection(one, d('2026-10-16'), blocked)).toEqual({
      start: '2026-10-16',
      end: '2026-10-16',
    });
  });
});
