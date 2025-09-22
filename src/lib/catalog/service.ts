import { prisma } from "@/lib/db";
import type { AuthSession } from "@/types/auth";
import {
  ProductCreate, ProductUpdate, VariantCreate, VariantUpdate,
  BundleItemCreate, UnitCreate, UnitUpdate,
  PriceBookCreate, PriceBookUpdate, PriceBookEntryCreate, PriceBookEntryUpdate
} from "./validators";

export async function requireOrg(session: AuthSession) {
  if (!session.organizationId) throw new Error("No organization in session");
  return session.organizationId;
}

// ---------- Units ----------
export async function listUnits(session: AuthSession) {
  const orgId = await requireOrg(session);
  return prisma.unit.findMany({ where: { organizationId: orgId }, orderBy: [{ code: "asc" }] });
}

export async function createUnit(session: AuthSession, data: unknown) {
  const orgId = await requireOrg(session);
  const parsed = UnitCreate.parse(data);
  return prisma.unit.create({
    data: { ...parsed, organizationId: orgId }
  });
}

export async function updateUnit(session: AuthSession, id: string, data: unknown) {
  const orgId = await requireOrg(session);
  const parsed = UnitUpdate.parse(data);
  return prisma.unit.update({
    where: { id },
    data: parsed,
  });
}

// ---------- Products ----------
export async function listProducts(session: AuthSession, query?: { q?: string; active?: boolean }) {
  const orgId = await requireOrg(session);
  return prisma.product.findMany({
    where: {
      organizationId: orgId,
      isActive: query?.active ?? undefined,
      ...(query?.q
        ? { name: { contains: query.q, mode: "insensitive" } }
        : {}),
    },
    include: {
      unit: true,
      category: true,
      variants: true,
    },
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function createProduct(session: AuthSession, raw: unknown, userId: string) {
  const orgId = await requireOrg(session);
  const data = ProductCreate.parse(raw);

  // Upserts for attributes/media are done after base create
  const product = await prisma.product.create({
    data: {
      organizationId: orgId,
      type: data.type,
      name: data.name,
      slug: data.slug || null,
      sku: data.sku || null,
      description: data.description || null,
      categoryId: data.categoryId || null,
      unitId: data.unitId || null,
      isActive: data.isActive ?? true,
      glCode: data.glCode || null,
      taxClassId: data.taxClassId || null,
      defaultCost: data.defaultCost as any,
      createdBy: userId,
      updatedBy: userId,
    },
  });

  if (data.attributes?.length) {
    await prisma.productAttribute.createMany({
      data: data.attributes.map(a => ({
        productId: product.id,
        key: a.key,
        value: a.value,
      })),
    });
  }
  if (data.media?.length) {
    await prisma.productMedia.createMany({
      data: data.media.map(m => ({
        productId: product.id,
        url: m.url,
        kind: m.kind,
        alt: m.alt,
        order: m.order ?? 0,
      })),
    });
  }

  return prisma.product.findUnique({
    where: { id: product.id },
    include: { attributes: true, media: true, variants: true, unit: true },
  });
}

export async function updateProduct(session: AuthSession, id: string, raw: unknown, userId: string) {
  const orgId = await requireOrg(session);
  const data = ProductUpdate.parse(raw);

  // prevent editing outside org
  const existing = await prisma.product.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) throw new Error("Product not found");

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...("type" in data ? { type: data.type } : {}),
      ...("name" in data ? { name: data.name! } : {}),
      slug: data.slug ?? undefined,
      sku: data.sku ?? undefined,
      description: data.description ?? undefined,
      categoryId: data.categoryId ?? undefined,
      unitId: data.unitId ?? undefined,
      isActive: data.isActive ?? undefined,
      glCode: data.glCode ?? undefined,
      taxClassId: data.taxClassId ?? undefined,
      defaultCost: (data.defaultCost as any) ?? undefined,
      updatedBy: userId,
    },
  });

  // Optional: replace attributes/media if provided
  if ("attributes" in data && Array.isArray(data.attributes)) {
    await prisma.productAttribute.deleteMany({ where: { productId: id } });
    if (data.attributes.length) {
      await prisma.productAttribute.createMany({
        data: data.attributes.map(a => ({ productId: id, key: a.key, value: a.value })),
      });
    }
  }
  if ("media" in data && Array.isArray(data.media)) {
    await prisma.productMedia.deleteMany({ where: { productId: id } });
    if (data.media.length) {
      await prisma.productMedia.createMany({
        data: data.media.map(m => ({
          productId: id, url: m.url, kind: m.kind, alt: m.alt, order: m.order ?? 0,
        })),
      });
    }
  }

  return prisma.product.findUnique({
    where: { id },
    include: { attributes: true, media: true, variants: true, unit: true },
  });
}

export async function deleteProduct(session: AuthSession, id: string) {
  const orgId = await requireOrg(session);
  // soft validation
  const exists = await prisma.product.findFirst({ where: { id, organizationId: orgId } });
  if (!exists) throw new Error("Product not found");
  await prisma.product.delete({ where: { id } });
  return { ok: true };
}

// ---------- Variants ----------
export async function createVariant(session: AuthSession, productId: string, raw: unknown) {
  const orgId = await requireOrg(session);
  const base = await prisma.product.findFirst({ where: { id: productId, organizationId: orgId } });
  if (!base) throw new Error("Product not found");
  const v = VariantCreate.parse(raw);
  return prisma.productVariant.create({
    data: {
      productId,
      sku: v.sku || null,
      name: v.name || null,
      attributes: v.attributes || undefined,
      isActive: v.isActive ?? true,
    },
  });
}

export async function updateVariant(session: AuthSession, variantId: string, raw: unknown) {
  const orgId = await requireOrg(session);
  const existing = await prisma.productVariant.findFirst({
    where: { id: variantId, product: { organizationId: orgId } },
  });
  if (!existing) throw new Error("Variant not found");
  const v = VariantUpdate.parse(raw);
  return prisma.productVariant.update({
    where: { id: variantId },
    data: {
      sku: v.sku ?? undefined,
      name: v.name ?? undefined,
      attributes: v.attributes ?? undefined,
      isActive: v.isActive ?? undefined,
    },
  });
}

export async function deleteVariant(session: AuthSession, variantId: string) {
  const orgId = await requireOrg(session);
  const existing = await prisma.productVariant.findFirst({
    where: { id: variantId, product: { organizationId: orgId } },
  });
  if (!existing) throw new Error("Variant not found");
  await prisma.productVariant.delete({ where: { id: variantId } });
  return { ok: true };
}

// ---------- Bundles ----------
export async function setBundleItems(session: AuthSession, productId: string, items: unknown[]) {
  const orgId = await requireOrg(session);
  const product = await prisma.product.findFirst({ where: { id: productId, organizationId: orgId } });
  if (!product) throw new Error("Product not found");
  if (product.type !== "BUNDLE") throw new Error("Only bundle products can have bundle items");

  const parsed = items.map(i => BundleItemCreate.parse(i));

  // Replace strategy (simplest & safe)
  await prisma.$transaction([
    prisma.bundleItem.deleteMany({ where: { bundleProductId: productId } }),
    prisma.bundleItem.createMany({
      data: parsed.map(i => ({
        bundleProductId: productId,
        childProductId: i.childProductId,
        quantity: i.quantity as any,
      })),
    }),
  ]);

  return prisma.bundleItem.findMany({
    where: { bundleProductId: productId },
    include: { child: true },
  });
}

// ---------- Price Books ----------
export async function listPriceBooks(session: AuthSession) {
  const orgId = await requireOrg(session);
  return prisma.priceBook.findMany({
    where: { organizationId: orgId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

export async function createPriceBook(session: AuthSession, raw: unknown, userId: string) {
  const orgId = await requireOrg(session);
  const data = PriceBookCreate.parse(raw);
  if (data.isDefault) {
    // unset other defaults
    await prisma.priceBook.updateMany({ where: { organizationId: orgId, isDefault: true }, data: { isDefault: false } });
  }
  return prisma.priceBook.create({
    data: {
      organizationId: orgId,
      name: data.name,
      currency: data.currency,
      priceBasis: data.priceBasis,
      isDefault: data.isDefault ?? false,
      isActive: data.isActive ?? true,
      validFrom: (data.validFrom as any) || null,
      validTo: (data.validTo as any) || null,
      tags: data.tags ? JSON.stringify(data.tags) : null,
      createdBy: userId,
      updatedBy: userId,
    },
  });
}

export async function updatePriceBook(session: AuthSession, id: string, raw: unknown, userId: string) {
  const orgId = await requireOrg(session);
  const exists = await prisma.priceBook.findFirst({ where: { id, organizationId: orgId } });
  if (!exists) throw new Error("Price book not found");
  const data = PriceBookUpdate.parse(raw);
  if (data.isDefault) {
    await prisma.priceBook.updateMany({ where: { organizationId: orgId, isDefault: true }, data: { isDefault: false } });
  }
  return prisma.priceBook.update({
    where: { id },
    data: {
      name: data.name ?? undefined,
      currency: data.currency ?? undefined,
      priceBasis: data.priceBasis ?? undefined,
      isDefault: data.isDefault ?? undefined,
      isActive: data.isActive ?? undefined,
      validFrom: (data.validFrom as any) ?? undefined,
      validTo: (data.validTo as any) ?? undefined,
      tags: data.tags !== undefined ? JSON.stringify(data.tags) : undefined,
      updatedBy: userId,
    },
  });
}

export async function addPriceBookEntry(session: AuthSession, priceBookId: string, raw: unknown) {
  const orgId = await requireOrg(session);
  const pb = await prisma.priceBook.findFirst({ where: { id: priceBookId, organizationId: orgId } });
  if (!pb) throw new Error("Price book not found");

  const data = PriceBookEntryCreate.parse(raw);

  // validate target product/variant belongs to org
  if (data.productId) {
    const p = await prisma.product.findFirst({ where: { id: data.productId, organizationId: orgId } });
    if (!p) throw new Error("Product not found in organization");
  }
  if (data.variantId) {
    const v = await prisma.productVariant.findFirst({ where: { id: data.variantId, product: { organizationId: orgId } } });
    if (!v) throw new Error("Variant not found in organization");
  }

  return prisma.priceBookEntry.create({
    data: {
      priceBookId,
      productId: data.productId ?? null,
      variantId: data.variantId ?? null,
      unitPrice: data.unitPrice as any,
      unitId: data.unitId ?? null,
      minQty: (data.minQty as any) ?? null,
      maxQty: (data.maxQty as any) ?? null,
      discountPct: (data.discountPct as any) ?? null,
      validFrom: (data.validFrom as any) ?? null,
      validTo: (data.validTo as any) ?? null,
    },
  });
}

export async function updatePriceBookEntry(session: AuthSession, entryId: string, raw: unknown) {
  const orgId = await requireOrg(session);
  const existing = await prisma.priceBookEntry.findFirst({
    where: { id: entryId, priceBook: { organizationId: orgId } },
  });
  if (!existing) throw new Error("Entry not found");

  const data = PriceBookEntryUpdate.parse(raw);
  // Do not allow switching between productId/variantId here without delete+create (safer)
  return prisma.priceBookEntry.update({
    where: { id: entryId },
    data: {
      unitPrice: (data.unitPrice as any) ?? undefined,
      unitId: data.unitId ?? undefined,
      minQty: (data.minQty as any) ?? undefined,
      maxQty: (data.maxQty as any) ?? undefined,
      discountPct: (data.discountPct as any) ?? undefined,
      validFrom: (data.validFrom as any) ?? undefined,
      validTo: (data.validTo as any) ?? undefined,
    },
  });
}

export async function deletePriceBookEntry(session: AuthSession, entryId: string) {
  const orgId = await requireOrg(session);
  const existing = await prisma.priceBookEntry.findFirst({
    where: { id: entryId, priceBook: { organizationId: orgId } },
  });
  if (!existing) throw new Error("Entry not found");
  await prisma.priceBookEntry.delete({ where: { id: entryId } });
  return { ok: true };
}
