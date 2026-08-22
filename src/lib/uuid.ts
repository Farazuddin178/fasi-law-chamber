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
 *
 * Prefer `offendingUuidValue` + `stripOffendingFields` where the column type is
 * not known for certain: this function throws away ids that are perfectly valid
 * for a non-uuid column.
 */
export function asUuidOrNull(value: unknown): string | null {
  return isUuid(value) ? (value as string).trim() : null;
}

/**
 * Pull the offending value out of Postgres' uuid cast error, e.g.
 *   invalid input syntax for type uuid: "1363"
 * Returns null when the error is something else.
 *
 * Postgres names the VALUE, not the column, which is what makes
 * stripOffendingFields possible.
 */
export function offendingUuidValue(error: unknown): string | null {
  const text = `${(error as any)?.message ?? ''} ${(error as any)?.details ?? ''}`;
  const match = /invalid input syntax for type uuid:\s*"([^"]*)"/i.exec(text);
  return match ? match[1] : null;
}

/**
 * Drop every field whose value is the one Postgres rejected.
 *
 * This lets a write survive a schema whose owner columns are typed `uuid` while
 * users.id is not, without hard-coding the assumption that ids are UUIDs - so
 * the same code keeps working after the column types are reconciled, and starts
 * recording attribution again automatically.
 */
export function stripOffendingFields<T extends Record<string, any>>(
  payload: T,
  offending: string
): { payload: Partial<T>; removed: string[] } {
  const removed: string[] = [];
  const next: Record<string, any> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (value !== null && value !== undefined && String(value) === offending) {
      removed.push(key);
    } else {
      next[key] = value;
    }
  }

  return { payload: next as Partial<T>, removed };
}
