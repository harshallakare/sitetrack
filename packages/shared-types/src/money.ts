/**
 * Money is persisted as an integer in "minor units" (paise/cents) everywhere
 * in the schema -- Prisma's `Decimal` type is unsupported on the SQLite
 * connector, which must remain the default local engine, and raw `Float`
 * risks drift. These helpers are the single place major/minor conversion
 * happens, used by both the API (DTO <-> Prisma) and the web app (display).
 */

export function toMinorUnits(majorAmount: number): number {
  return Math.round(majorAmount * 100);
}

export function fromMinorUnits(minorAmount: number): number {
  return minorAmount / 100;
}

export function formatMoney(minorAmount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(fromMinorUnits(minorAmount));
}
