function partsAt(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)])) as Record<string, number>;
}

export function utcToZonedInput(date: Date, timezone: string) {
  try {
    const part = partsAt(date, timezone);
    return `${part.year}-${String(part.month).padStart(2,"0")}-${String(part.day).padStart(2,"0")}T${String(part.hour).padStart(2,"0")}:${String(part.minute).padStart(2,"0")}`;
  } catch {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
  }
}

export function zonedInputToUtc(value: string, timezone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Enter a valid date and time.");
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const h = Number(match[4]);
  const min = Number(match[5]);
  const target = Date.UTC(y, m - 1, d, h, min);
  let guess = target;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const part = partsAt(new Date(guess), timezone);
    const actual = Date.UTC(part.year, part.month - 1, part.day, part.hour, part.minute);
    const correction = target - actual;
    if (correction === 0) break;
    guess += correction;
  }
  return new Date(guess).toISOString();
}
