import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

const translationSchema = z.object({
  locale: z.string().trim().min(1),
  name: z.string().trim().min(1),
  subtitle: z.string().trim().min(1).optional(),
  rulesText: z.string().trim().min(1).optional(),
  flavorText: z.string().trim().min(1).optional(),
});

const cardSchema = z.object({
  id: z.string().trim().min(1),
  collectorNumber: z.string().trim().min(1),
  name: z.string().trim().min(1),
  rarity: z.enum(["COMMON", "UNCOMMON", "RARE", "EPIC", "ULTIMATE", "UNKNOWN"]),
  officialRarityRaw: z.string().trim().min(1).optional(),
  kind: z.enum(["GAMEPLAY", "ENERGY", "TOKEN", "RULES"]),
  printTreatment: z.enum(["REGULAR", "ALT", "OVERNUMBER", "UNKNOWN"]),
  printTreatmentRaw: z.string().trim().min(1).optional(),
  hasShowcase: z.boolean(),
  translations: z.array(translationSchema).min(1),
});

const setSchema = z.object({
  id: z.string().trim().min(1),
  code: z.string().regex(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/, "Set codes must be uppercase letters/numbers separated by hyphens."),
  name: z.string().trim().min(1),
  releasedAt: z.string().datetime({ offset: true }).nullable().optional(),
  cards: z.array(cardSchema).min(1),
});

const seedSchema = z.object({
  notice: z.string().trim().min(1),
  sets: z.array(setSchema).min(1),
});

function validateUniqueValues(seedData) {
  for (const set of seedData.sets) {
    const collectorNumbers = new Set();
    for (const card of set.cards) {
      if (collectorNumbers.has(card.collectorNumber)) {
        throw new Error(`Duplicate collector number ${card.collectorNumber} in set ${set.code}.`);
      }
      collectorNumbers.add(card.collectorNumber);

      const locales = new Set();
      for (const translation of card.translations) {
        if (locales.has(translation.locale)) {
          throw new Error(`Duplicate translation locale ${translation.locale} for card ${card.id}.`);
        }
        locales.add(translation.locale);
      }
    }
  }
}

async function loadSeedData() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const seedPath = join(currentDir, "mock-data", "riftbound-cards.json");
  const seedData = seedSchema.parse(JSON.parse(await readFile(seedPath, "utf8")));
  validateUniqueValues(seedData);
  return seedData;
}

async function seedOfficialMetadata(seedData) {
  let setCount = 0;
  let cardCount = 0;
  let translationCount = 0;

  for (const set of seedData.sets) {
    await prisma.set.upsert({
      where: { code: set.code },
      create: { id: set.id, code: set.code, name: set.name, releasedAt: set.releasedAt ? new Date(set.releasedAt) : null },
      update: { name: set.name, releasedAt: set.releasedAt ? new Date(set.releasedAt) : null },
    });
    setCount += 1;

    for (const card of set.cards) {
      await prisma.card.upsert({
        where: { setId_collectorNumber: { setId: set.id, collectorNumber: card.collectorNumber } },
        create: {
          id: card.id,
          setId: set.id,
          collectorNumber: card.collectorNumber,
          name: card.name,
          rarity: card.rarity,
          officialRarityRaw: card.officialRarityRaw ?? null,
          kind: card.kind,
          printTreatment: card.printTreatment,
          printTreatmentRaw: card.printTreatmentRaw ?? null,
          hasShowcase: card.hasShowcase,
          officialImageUrl: null,
          officialArtist: null,
          officialRawJson: { source: "local-mock-phase-4a", notice: seedData.notice },
        },
        update: {
          name: card.name,
          rarity: card.rarity,
          officialRarityRaw: card.officialRarityRaw ?? null,
          kind: card.kind,
          printTreatment: card.printTreatment,
          printTreatmentRaw: card.printTreatmentRaw ?? null,
          hasShowcase: card.hasShowcase,
          officialImageUrl: null,
          officialArtist: null,
          officialRawJson: { source: "local-mock-phase-4a", notice: seedData.notice },
        },
      });
      cardCount += 1;

      for (const translation of card.translations) {
        await prisma.cardTranslation.upsert({
          where: { cardId_locale: { cardId: card.id, locale: translation.locale } },
          create: {
            cardId: card.id,
            locale: translation.locale,
            name: translation.name,
            subtitle: translation.subtitle ?? null,
            rulesText: translation.rulesText ?? null,
            flavorText: translation.flavorText ?? null,
          },
          update: {
            name: translation.name,
            subtitle: translation.subtitle ?? null,
            rulesText: translation.rulesText ?? null,
            flavorText: translation.flavorText ?? null,
          },
        });
        translationCount += 1;
      }
    }
  }

  return { setCount, cardCount, translationCount };
}

async function main() {
  const seedData = await loadSeedData();
  const counts = await seedOfficialMetadata(seedData);
  console.log(`Seeded mock official metadata: ${counts.setCount} set(s), ${counts.cardCount} card(s), ${counts.translationCount} translation(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
