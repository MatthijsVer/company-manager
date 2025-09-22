/* prisma/seedProducts.mjs */
import {
  PrismaClient,
  OrgRole,
  ProductType,
  PriceBasis,
  UnitKind,
} from "@prisma/client";

const prisma = new PrismaClient();

function getArg(name) {
  const flag = process.argv.find((a) => a.startsWith(`--${name}=`));
  return flag ? flag.split("=")[1] : undefined;
}

async function upsertUnit(orgId, code, label, kind = UnitKind.UNIT) {
  return prisma.unit.upsert({
    where: { organizationId_code: { organizationId: orgId, code } },
    update: { label, kind, isActive: true },
    create: { organizationId: orgId, code, label, kind, isActive: true },
  });
}

async function upsertCategory(orgId, name, parentId) {
  const slug = name.toLowerCase().replace(/\s+/g, "-");

  if (parentId) {
    // Normal case (with parentId) → upsert works fine
    return prisma.productCategory.upsert({
      where: {
        organizationId_parentId_name: {
          organizationId: orgId,
          parentId,
          name,
        },
      },
      update: {},
      create: {
        organizationId: orgId,
        name,
        slug,
        parentId,
      },
    });
  } else {
    // Top-level category → cannot use upsert (parentId=null)
    const existing = await prisma.productCategory.findFirst({
      where: { organizationId: orgId, parentId: null, name },
    });

    if (existing) return existing;

    return prisma.productCategory.create({
      data: { organizationId: orgId, name, slug, parentId: null },
    });
  }
}


async function upsertTaxClass(orgId, name, description) {
  return prisma.taxClass.upsert({
    where: { organizationId_name: { organizationId: orgId, name } },
    update: { description },
    create: { organizationId: orgId, name, description },
  });
}

async function main() {
  const orgId = 'cmf6u5cll00008ox7iyp7x88m' || getArg("org");
  if (!orgId) {
    throw new Error("Missing organization id. Provide via env SEED_ORG_ID or CLI flag --org=<id>.");
  }

  console.log("Seeding catalog for org:", orgId);

  // 1) Catalog settings
  await prisma.catalogSettings.upsert({
    where: { organizationId: orgId },
    update: {
      currency: "EUR",
      currencyMode: "ORG_DEFAULT",
      priceBasis: PriceBasis.EXCLUSIVE,
      rounding: { strategy: "HALF_UP", decimals: 2 },
      numberFormats: { currency: "nl-NL", quantity: 3 },
    },
    create: {
      organizationId: orgId,
      currency: "EUR",
      currencyMode: "ORG_DEFAULT",
      priceBasis: PriceBasis.EXCLUSIVE,
      rounding: { strategy: "HALF_UP", decimals: 2 },
      numberFormats: { currency: "nl-NL", quantity: 3 },
    },
  });

  // 2) Units
  const [EA, HOUR, DAY, KM] = await Promise.all([
    upsertUnit(orgId, "EA", "Each", UnitKind.UNIT),
    upsertUnit(orgId, "H", "Hour", UnitKind.TIME),
    upsertUnit(orgId, "D", "Day", UnitKind.TIME),
    upsertUnit(orgId, "KM", "Kilometer", UnitKind.LENGTH),
  ]);

  // 3) Tax class + rule
  const stdClass = await upsertTaxClass(orgId, "Standard 21%", "Default VAT 21%");
  await prisma.taxRule.upsert({
    where: { id: `${stdClass.id}-NL-21` },
    update: {
      rate: 21.0,
      isActive: true,
      name: "NL VAT 21%",
      priority: 0,
    },
    create: {
      id: `${stdClass.id}-NL-21`,
      organizationId: orgId,
      taxClassId: stdClass.id,
      name: "NL VAT 21%",
      rate: 21.0,
      country: "NL",
      isCompound: false,
      priority: 0,
      isActive: true,
    },
  });

  // 4) Categories
  const servicesCat = await upsertCategory(orgId, "Services");
  const goodsCat = await upsertCategory(orgId, "Goods");

  // 5) Products
  const consulting = await prisma.product.upsert({
    where: { organizationId_sku: { organizationId: orgId, sku: "CONSULT-001" } },
    update: {
      name: "Consulting",
      description: "Professional services billed by the hour.",
      unitId: HOUR.id,
      isActive: true,
      taxClassId: stdClass.id,
      defaultCost: 60.0,
      categoryId: servicesCat.id,
      type: ProductType.SERVICE,
    },
    create: {
      organizationId: orgId,
      name: "Consulting",
      slug: "consulting",
      sku: "CONSULT-001",
      description: "Professional services billed by the hour.",
      unitId: HOUR.id,
      isActive: true,
      taxClassId: stdClass.id,
      defaultCost: 60.0,
      categoryId: servicesCat.id,
      type: ProductType.SERVICE,
      createdBy: "seed",
    },
  });

  const license = await prisma.product.upsert({
    where: { organizationId_sku: { organizationId: orgId, sku: "LIC-BASE" } },
    update: {
      name: "SaaS License",
      description: "Subscription license with tiers.",
      unitId: EA.id,
      isActive: true,
      taxClassId: stdClass.id,
      categoryId: goodsCat.id,
      type: ProductType.GOOD,
    },
    create: {
      organizationId: orgId,
      name: "SaaS License",
      slug: "saas-license",
      sku: "LIC-BASE",
      description: "Subscription license with tiers.",
      unitId: EA.id,
      isActive: true,
      taxClassId: stdClass.id,
      categoryId: goodsCat.id,
      type: ProductType.GOOD,
      createdBy: "seed",
      media: { create: [{ url: "https://picsum.photos/seed/license/800/450", kind: "image", alt: "SaaS License" }] },
      attributes: { create: [{ key: "Family", value: "License" }] },
    },
  });

  const basic = await prisma.productVariant.upsert({
    where: { productId_sku: { productId: license.id, sku: "LIC-BASIC" } },
    update: { name: "Basic", isActive: true },
    create: {
      productId: license.id,
      sku: "LIC-BASIC",
      name: "Basic",
      attributes: { tier: "basic" },
      isActive: true,
    },
  });

  const pro = await prisma.productVariant.upsert({
    where: { productId_sku: { productId: license.id, sku: "LIC-PRO" } },
    update: { name: "Pro", isActive: true },
    create: {
      productId: license.id,
      sku: "LIC-PRO",
      name: "Pro",
      attributes: { tier: "pro" },
      isActive: true,
    },
  });

  const kit = await prisma.product.upsert({
    where: { organizationId_sku: { organizationId: orgId, sku: "KIT-START" } },
    update: {
      name: "Starter Kit",
      description: "Getting started hardware kit.",
      unitId: EA.id,
      isActive: true,
      taxClassId: stdClass.id,
      categoryId: goodsCat.id,
      type: ProductType.GOOD,
    },
    create: {
      organizationId: orgId,
      name: "Starter Kit",
      slug: "starter-kit",
      sku: "KIT-START",
      description: "Getting started hardware kit.",
      unitId: EA.id,
      isActive: true,
      taxClassId: stdClass.id,
      categoryId: goodsCat.id,
      type: ProductType.GOOD,
      createdBy: "seed",
      media: { create: [{ url: "https://picsum.photos/seed/kit/800/450", kind: "image", alt: "Starter Kit" }] },
      attributes: { create: [{ key: "Color", value: "Black" }, { key: "Warranty", value: "24m" }] },
    },
  });

  const bundle = await prisma.product.upsert({
    where: { organizationId_sku: { organizationId: orgId, sku: "BND-IMPL" } },
    update: {
      name: "Implementation Package",
      description: "Fixed-scope implementation including kit and consulting.",
      unitId: EA.id,
      isActive: true,
      taxClassId: stdClass.id,
      categoryId: servicesCat.id,
      type: ProductType.BUNDLE,
    },
    create: {
      organizationId: orgId,
      name: "Implementation Package",
      slug: "implementation-package",
      sku: "BND-IMPL",
      description: "Fixed-scope implementation including kit and consulting.",
      unitId: EA.id,
      isActive: true,
      taxClassId: stdClass.id,
      categoryId: servicesCat.id,
      type: ProductType.BUNDLE,
      createdBy: "seed",
      media: { create: [{ url: "https://picsum.photos/seed/bundle/800/450", kind: "image", alt: "Implementation" }] },
    },
  });

  await prisma.bundleItem.deleteMany({ where: { bundleProductId: bundle.id } });
  await prisma.bundleItem.createMany({
    data: [
      { bundleProductId: bundle.id, childProductId: kit.id, quantity: 1 },
      { bundleProductId: bundle.id, childProductId: consulting.id, quantity: 16 },
    ],
    skipDuplicates: true,
  });

  const defaultPB = await prisma.priceBook.upsert({
    where: { organizationId_name: { organizationId: orgId, name: "Default (EUR)" } },
    update: { currency: "EUR", priceBasis: PriceBasis.EXCLUSIVE, isDefault: true, isActive: true },
    create: {
      organizationId: orgId,
      name: "Default (EUR)",
      currency: "EUR",
      priceBasis: PriceBasis.EXCLUSIVE,
      isDefault: true,
      isActive: true,
      createdBy: "seed",
    },
  });

  await prisma.priceBookEntry.deleteMany({ where: { priceBookId: defaultPB.id } });
  await prisma.priceBookEntry.createMany({
    data: [
      { priceBookId: defaultPB.id, productId: consulting.id, unitId: HOUR.id, unitPrice: 120.0 },
      { priceBookId: defaultPB.id, productId: consulting.id, unitId: HOUR.id, unitPrice: 110.0, minQty: 10 },
      { priceBookId: defaultPB.id, productId: consulting.id, unitId: HOUR.id, unitPrice: 99.0, minQty: 50 },
      { priceBookId: defaultPB.id, variantId: basic.id, unitId: EA.id, unitPrice: 49.0 },
      { priceBookId: defaultPB.id, variantId: pro.id, unitId: EA.id, unitPrice: 99.0 },
      { priceBookId: defaultPB.id, productId: kit.id, unitId: EA.id, unitPrice: 299.0 },
      { priceBookId: defaultPB.id, productId: bundle.id, unitId: EA.id, unitPrice: 2590.0 },
    ],
    skipDuplicates: true,
  });

  const rateCard = await prisma.rateCard.upsert({
    where: { organizationId_name: { organizationId: orgId, name: "Default Services" } },
    update: { currency: "EUR", isDefault: true, isActive: true },
    create: {
      organizationId: orgId,
      name: "Default Services",
      currency: "EUR",
      isDefault: true,
      isActive: true,
      createdBy: "seed",
    },
  });

  await prisma.rateCardItem.deleteMany({ where: { rateCardId: rateCard.id } });
  await prisma.rateCardItem.createMany({
    data: [
      { rateCardId: rateCard.id, role: OrgRole.PROJECT_MANAGER, unitId: HOUR.id, unitPrice: 120.0, productId: consulting.id },
      { rateCardId: rateCard.id, role: OrgRole.MEMBER, unitId: HOUR.id, unitPrice: 95.0, productId: consulting.id },
      { rateCardId: rateCard.id, role: OrgRole.CONTRACTOR, unitId: HOUR.id, unitPrice: 85.0, productId: consulting.id },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Seeded catalog for org:", orgId);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
