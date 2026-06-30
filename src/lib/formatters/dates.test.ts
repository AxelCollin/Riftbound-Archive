import { afterEach, describe, expect, it } from "vitest";
import { formatDateTimeFr } from "./dates";

const ORIGINAL_APP_TIMEZONE = process.env.APP_TIMEZONE;

afterEach(() => {
  if (ORIGINAL_APP_TIMEZONE === undefined) {
    delete process.env.APP_TIMEZONE;
  } else {
    process.env.APP_TIMEZONE = ORIGINAL_APP_TIMEZONE;
  }
});

describe("formatDateTimeFr", () => {
  it("formats a UTC timestamp using the configured Europe/Paris timezone", () => {
    process.env.APP_TIMEZONE = "Europe/Paris";

    expect(formatDateTimeFr("2026-06-10T10:00:00.000Z")).toBe("10 juin 2026, 12:00");
  });

  it("falls back to Europe/Paris when APP_TIMEZONE is not set", () => {
    delete process.env.APP_TIMEZONE;

    expect(formatDateTimeFr("2026-06-10T10:00:00.000Z")).toBe("10 juin 2026, 12:00");
  });

  it("accepts Date input", () => {
    process.env.APP_TIMEZONE = "Europe/Paris";

    expect(formatDateTimeFr(new Date("2026-01-10T10:00:00.000Z"))).toBe("10 janv. 2026, 11:00");
  });
});
