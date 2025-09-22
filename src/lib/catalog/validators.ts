import { z } from "zod";

export const Id = z.string().min(1);

export const UnitCreate = z.object({
  code: z.string().trim().min(1).max(16),
  label: z.string().trim().min(1).max(64),
  kind: z.enum(["UNIT","TIME","LENGTH","AREA","VOLUME","WEIGHT","OTHER"]).default("UNIT"),
  isActive: z.boolean().optional(),
});

export const UnitUpdate = UnitCreate.partial();

export const ProductCreate = z.object({
  type: z.enum(["SERVICE","GOOD","BUNDLE"]).default("SERVICE"),
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(200).optional().nullable(),
  sku: z.string().trim().max(120).optional().nullable(),
  description: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  unitId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  glCode: z.string().optional().nullable(),
  taxClassId: z.string().optional().nullable(),
  defaultCost: z.preprocess((v) => v === "" ? undefined : v, z.number().nonnegative().optional()),
  attributes: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
  media: z.array(z.object({
    url: z.string().url(),
    kind: z.string().optional(),
    alt: z.string().optional(),
    order: z.number().int().min(0).optional(),
  })).optional(),
});

export const ProductUpdate = ProductCreate.partial();

export const VariantCreate = z.object({
  sku: z.string().trim().max(120).optional().nullable(),
  name: z.string().trim().max(200).optional().nullable(),
  attributes: z.record(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const VariantUpdate = VariantCreate.partial();

export const BundleItemCreate = z.object({
  childProductId: Id,
  quantity: z.preprocess((v) => Number(v), z.number().positive()),
});

export const PriceBookCreate = z.object({
  name: z.string().trim().min(1),
  currency: z.string().length(3),
  priceBasis: z.enum(["EXCLUSIVE","INCLUSIVE"]).default("EXCLUSIVE"),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  validFrom: z.string().datetime().optional().nullable(),
  validTo: z.string().datetime().optional().nullable(),
  tags: z.any().optional(),
});

export const PriceBookUpdate = PriceBookCreate.partial();

export const PriceBookEntryCreate = z.object({
  productId: z.string().optional(),
  variantId: z.string().optional(),
  unitPrice: z.preprocess((v) => Number(v), z.number().finite()),
  unitId: z.string().optional().nullable(),
  minQty: z.preprocess((v) => (v===""||v==null?undefined:Number(v)), z.number().positive().optional()),
  maxQty: z.preprocess((v) => (v===""||v==null?undefined:Number(v)), z.number().positive().optional()),
  discountPct: z.preprocess((v) => (v===""||v==null?undefined:Number(v)), z.number().min(0).max(100).optional()),
  validFrom: z.string().datetime().optional().nullable(),
  validTo: z.string().datetime().optional().nullable(),
}).superRefine((val, ctx) => {
  // XOR constraint: exactly one of productId or variantId
  const setCount = [!!val.productId, !!val.variantId].filter(Boolean).length;
  if (setCount !== 1) {
    ctx.addIssue({ code: "custom", message: "Provide exactly one of productId or variantId." });
  }
  if (val.minQty && val.maxQty && val.maxQty < val.minQty) {
    ctx.addIssue({ code: "custom", message: "maxQty must be ≥ minQty." });
  }
});

export const PriceBookEntryUpdate = PriceBookEntryCreate.partial();
