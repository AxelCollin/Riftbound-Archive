import { prisma } from "@/lib/db";
import { getDefaultBoosterSettings, normalizeBoosterSettingsInput, type BoosterSettingsInput, type NormalizedBoosterSettings } from "@/lib/domain/boosters";

export type BoosterSettingsView = NormalizedBoosterSettings & {
  id: string | null;
  accrualAnchorAt: string;
  createdAt: string | null;
  updatedAt: string | null;
};

type BoosterSettingsRecord = {
  id: string;
  boostersPerInterval: number;
  intervalCount: number;
  intervalUnit: "DAY";
  accrualAnchorAt: Date;
  autoDecrementOnOpening: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function toView(record: BoosterSettingsRecord | null): BoosterSettingsView {
  if (!record) {
    return {
      ...getDefaultBoosterSettings(),
      id: null,
      accrualAnchorAt: new Date(0).toISOString(),
      createdAt: null,
      updatedAt: null,
    };
  }

  return {
    id: record.id,
    boostersPerInterval: record.boostersPerInterval,
    intervalCount: record.intervalCount,
    intervalUnit: record.intervalUnit,
    accrualAnchorAt: record.accrualAnchorAt.toISOString(),
    autoDecrementOnOpening: record.autoDecrementOnOpening,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function getBoosterSettings(): Promise<BoosterSettingsView> {
  const record = await prisma.boosterSettings.findFirst({ orderBy: { createdAt: "asc" } });
  return toView(record as BoosterSettingsRecord | null);
}

export async function updateBoosterSettings(input: BoosterSettingsInput): Promise<BoosterSettingsView> {
  const settings = normalizeBoosterSettingsInput(input);
  const existing = await prisma.boosterSettings.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
  const data = {
    boostersPerInterval: settings.boostersPerInterval,
    intervalCount: settings.intervalCount,
    intervalUnit: settings.intervalUnit,
    autoDecrementOnOpening: settings.autoDecrementOnOpening,
  };

  const record = existing
    ? await prisma.boosterSettings.update({ where: { id: existing.id }, data })
    : await prisma.boosterSettings.create({ data: { ...data, accrualAnchorAt: new Date() } });

  return toView(record as BoosterSettingsRecord);
}
