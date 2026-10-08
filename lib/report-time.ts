// Dates shown in the workspace and dates used for report filters share one zone.
export const REPORT_TIME_ZONE = "Asia/Tashkent";
const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: REPORT_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

export function reportTime(value: string | Date = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), time: `${parts.hour}:${parts.minute}:${parts.second}` };
}

export function reportDate(value: string | Date = new Date()) {
  return reportTime(value)?.date ?? "";
}

export function calendarDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const ms = Date.parse(value + "T00:00:00Z");
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value ? ms : null;
}
