import { BookingStatus, DateRange, IsoDateTime, Money, Pricing } from '../models';

const eur = new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' });

/** Formate un montant en centimes, ex. `1250` → `12,50 €`. */
export const formatMoney = (money: Money): string => eur.format(money.amountCents / 100);

const PRICING_SUFFIX = {
  par_heure: '/ heure',
  par_jour: '/ jour',
  par_weekend: '/ week-end',
  par_mois: '/ mois',
} as const satisfies Record<Exclude<Pricing['mode'], 'gratuit'>, string>;

/** Libellé de prix affiché sur les cartes, ex. `15,00 € / jour` ou `Gratuit`. */
export const formatPricing = (pricing: Pricing): string =>
  pricing.mode === 'gratuit'
    ? 'Gratuit'
    : `${formatMoney(pricing.price)} ${PRICING_SUFFIX[pricing.mode]}`;

const shortDate = new Intl.DateTimeFormat('fr-BE', { day: 'numeric', month: 'short' });

/** Période courte, ex. `14 oct. → 16 oct.` */
export const formatDateRange = (range: DateRange): string =>
  `${shortDate.format(new Date(range.start))} → ${shortDate.format(new Date(range.end))}`;

/** Nombre de jours restants avant une échéance (0 si dépassée). */
export const daysUntil = (date: IsoDateTime, from = new Date()): number =>
  Math.max(0, Math.ceil((new Date(date).getTime() - from.getTime()) / 86_400_000));

/** Libellés des statuts de réservation. */
export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  en_attente: 'En attente',
  confirmee: 'Confirmée',
  refusee: 'Refusée',
  annulee: 'Annulée',
  en_cours: 'En cours',
  terminee: 'Terminée',
  litige: 'Litige',
};

/** Couleurs Tailwind des badges de statut. */
export const BOOKING_STATUS_BADGES: Record<BookingStatus, string> = {
  en_attente: 'bg-amber-100 text-amber-800',
  confirmee: 'bg-emerald-100 text-emerald-800',
  refusee: 'bg-red-100 text-red-800',
  annulee: 'bg-slate-100 text-slate-600',
  en_cours: 'bg-sky-100 text-sky-800',
  terminee: 'bg-slate-100 text-slate-600',
  litige: 'bg-red-100 text-red-800',
};
