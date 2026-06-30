const DEFAULT_APP_TIMEZONE = "Europe/Paris";

export function formatDateTimeFr(value: string | Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: process.env.APP_TIMEZONE || DEFAULT_APP_TIMEZONE,
  }).format(new Date(value));
}
