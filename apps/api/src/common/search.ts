/**
 * Engine-aware case-insensitive `contains` filter.
 *
 * SQLite's LIKE is case-insensitive for ASCII by default, but Postgres LIKE
 * is case-sensitive, so a plain `{ contains }` behaves differently across
 * the engines this app supports. Prisma's `mode: "insensitive"` fixes
 * Postgres but is REJECTED by the SQLite connector -- hence the conditional.
 * (MySQL's default collation is already case-insensitive.)
 */
export function insensitiveContains(value: string): Record<string, unknown> {
  return process.env.DATABASE_PROVIDER === "postgresql"
    ? { contains: value, mode: "insensitive" }
    : { contains: value };
}
