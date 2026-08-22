/**
 * UUID helpers.
 *
 * Why this exists: the login payload from the `auth-login` edge function can
 * carry more than one identifier for the same account - a numeric row id in
 * `id` alongside the real UUID in `user_id`/`uid`. AuthContext used to pick
 * `id ?? user_id ?? uid`, which prefers whichever field is present rather than
 * whichever field is correct, so a numeric id won.
 *
 * That value was then written into UUID columns (`cases.created_by`,
 * `expenses.submitted_by`), and Postgres rejected the whole statement with
 *   invalid input syntax for type uuid: "1363"
 * which is why adding a case and submitting an expense both failed.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when `value` is a canonical UUID string. */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

/**
 * Pick the first UUID-shaped candidate.
 *
 * Falls back to the first non-empty candidate when none look like a UUID, so
 * deployments whose ids genuinely are not UUIDs keep working exactly as before.
 */
export function pickUuid(...candidates: unknown[]): string | null {
  const uuid = candidates.find(isUuid);
  if (uuid) return (uuid as string).trim();

  const fallback = candidates.find(
    (c) => c !== undefined && c !== null && String(c).trim() !== ''
  );
  return fallback === undefined ? null : String(fallback);
}

/**
 * Value for a column typed `uuid`. Returns null for anything that is not a
 * UUID, so a bad id becomes a null FK rather than a failed INSERT that loses
 * the user's work.
 */
export function asUuidOrNull(value: unknown): string | null {
  return isUuid(value) ? (value as string).trim() : null;
}
