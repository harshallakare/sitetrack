/**
 * P2002 = unique constraint violation. Used to make find-then-create flows
 * self-healing under concurrency: the DB constraint is the real guarantee,
 * and a race that trips it is converted back into the idempotent result
 * (or a clean 409) instead of surfacing as a 500.
 */
export function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2002"
  );
}
