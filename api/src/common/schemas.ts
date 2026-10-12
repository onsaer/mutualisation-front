import { z } from 'zod';

// Messages d'erreur de validation en français.
z.config(z.locales.fr());

/**
 * Schémas de validation des entrées de l'API, alignés sur les types du domaine.
 * Les messages restent simples : le front affiche ses propres messages de formulaire.
 */
export const userRoleSchema = z.enum(['pro', 'particulier']);
export const resourceTypeSchema = z.enum(['materiel', 'espace', 'achat_groupe']);

const money = z.object({
  amountCents: z.number().int().nonnegative(),
  currency: z.literal('EUR'),
});

const isoDateTime = z.iso.datetime({ offset: true });

const dateRange = z
  .object({ start: isoDateTime, end: isoDateTime })
  .refine((r) => r.start < r.end, { message: 'La fin doit suivre le début.' });

const address = z.object({
  street: z.string().trim().min(1),
  number: z.string().trim(),
  box: z.string().trim().optional(),
  postalCode: z.string().regex(/^[1-9]\d{3}$/, 'Code postal belge à 4 chiffres.'),
  municipality: z.string().trim().min(1),
  region: z.enum(['bruxelles', 'wallonie', 'flandre']),
  country: z.literal('BE'),
});

const pricing = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('gratuit') }),
  z.object({
    mode: z.enum(['par_heure', 'par_jour', 'par_weekend', 'par_mois']),
    price: money,
  }),
]);

const base = {
  title: z.string().trim().min(5).max(80),
  description: z.string().trim().max(1000).default(''),
  photoUrls: z.array(z.url()).max(10).default([]),
  audience: z
    .array(userRoleSchema)
    .min(1)
    .refine((a) => new Set(a).size === a.length, 'Public en double.'),
  address,
};

export const newResourceSchema = z.discriminatedUnion('type', [
  z.object({
    ...base,
    type: z.literal('materiel'),
    category: z.string().trim().toLowerCase().min(1),
    condition: z.enum(['neuf', 'tres_bon', 'bon', 'use']),
    pricing,
    deposit: money.optional(),
    weekendOnly: z.boolean(),
    unavailable: z.array(dateRange).default([]),
  }),
  z.object({
    ...base,
    type: z.literal('espace'),
    kind: z.enum(['stockage', 'bureau', 'atelier', 'entrepot', 'cave_garage']),
    surfaceM2: z.number().positive(),
    access: z.enum(['libre', 'sur_rendez_vous', 'badge']),
    pricing,
    deposit: money.optional(),
    unavailable: z.array(dateRange).default([]),
  }),
  z
    .object({
      ...base,
      type: z.literal('achat_groupe'),
      productName: z.string().trim().min(1),
      unit: z.string().trim().min(1),
      unitPrice: money,
      minQuantity: z.number().int().min(2),
      maxQuantity: z.number().int().positive().optional(),
      committedQuantity: z.literal(0).default(0),
      deadline: isoDateTime,
      expectedDeliveryAt: isoDateTime.optional(),
    })
    .refine((a) => a.maxQuantity === undefined || a.maxQuantity >= a.minQuantity, {
      message: 'Le maximum doit dépasser le seuil.',
      path: ['maxQuantity'],
    }),
]);
export type NewResourceInput = z.infer<typeof newResourceSchema>;

export const resourceQuerySchema = z.object({
  type: resourceTypeSchema,
  audience: userRoleSchema.optional(),
  ownerRole: userRoleSchema.optional(),
  ownerId: z.string().optional(),
});

export const newBookingSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('location'), resourceId: z.string(), period: dateRange }),
  z.object({
    kind: z.literal('achat_groupe'),
    resourceId: z.string(),
    quantity: z.number().int().positive(),
  }),
]);
export type NewBookingInput = z.infer<typeof newBookingSchema>;

export const bookingStatusSchema = z.enum([
  'en_attente',
  'confirmee',
  'refusee',
  'annulee',
  'en_cours',
  'terminee',
  'litige',
]);

export const statusChangeSchema = z.object({
  status: bookingStatusSchema,
  comment: z.string().trim().max(500).optional(),
});

export const bookingListQuerySchema = z.object({
  as: z.enum(['requester', 'owner']).default('requester'),
});
