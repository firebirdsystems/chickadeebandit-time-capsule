// Pure, testable logic extracted from index.html.
// No DOM, no network — safe to import from Node for unit tests.

/**
 * Steady identity for a calendar entry an automation rule makes from a capsule.
 *
 * A capsule's reveal date is fixed once it is sealed, so this app never needs to
 * move or retract the entry — but the calendar action that only ever inserts was
 * removed, because it made that the *easy* choice for publishers who do need to.
 * Supplying a reference costs nothing here and makes republishing idempotent:
 * the entry is keyed on the capsule, not on the event that announced it.
 */
export function calendarRef(id) {
  return `time-capsule:${id}`;
}

/** `YYYY-MM-DD` from a Date's LOCAL parts. Never `toISOString()`: the Dates in
 *  this module are built from local components, and reading one back in UTC
 *  names the previous day west of Greenwich. */
function localKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function nextYear(now = new Date()) {
  const d = new Date(now);
  d.setFullYear(d.getFullYear() + 1);
  return localKey(d);
}

export function fmtDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" })
    .format(new Date(`${value}T12:00:00`));
}

export function statusLabel(status) {
  return status === "open" ? "Open" : status === "closed" ? "Sealed" : status === "revealed" ? "Revealed" : "Archived";
}

export function capsuleEntries(entries, capsuleId) {
  return entries.filter(e => e.capsule_id === capsuleId).sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function entryAttachments(attachments, entryId) {
  return attachments.filter(a => a.entry_id === entryId).sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function memberById(members, id) {
  return members.find(m => m.id === id) ?? null;
}

export function canAddEntry(capsule) {
  return capsule?.status === "open";
}

// Everyone can read once the capsule is revealed/archived OR its reveal date has
// arrived — this mirrors the hub's sealed_until visible_after_parent_column gate,
// which releases entries by wall clock regardless of whether anyone clicked Reveal.
// `nowIso` is compared lexicographically against the "YYYY-MM-DD" reveal_date, so a
// capsule opens from the start of its reveal day in UTC, exactly as the hub does.
export function canReadEntries(capsule, nowIso = new Date().toISOString()) {
  if (["revealed", "archived"].includes(capsule?.status)) return true;
  return !!capsule?.reveal_date && capsule.reveal_date <= nowIso;
}

// The status to show the user: a capsule whose reveal date has passed reads as
// "revealed" even if no one has clicked Reveal yet, so the pill/labels never claim
// "Sealed" for entries the hub is already releasing to everyone.
export function effectiveStatus(capsule, nowIso = new Date().toISOString()) {
  if (!capsule) return capsule?.status;
  if (["revealed", "archived"].includes(capsule.status)) return capsule.status;
  return canReadEntries(capsule, nowIso) ? "revealed" : capsule.status;
}

export function isMine(entry, memberId) {
  return entry.member_id === memberId;
}

// Everyone can read once released (see canReadEntries); before that a member sees only their own.
export function visibleEntries(entries, capsule, memberId, nowIso = new Date().toISOString()) {
  const list = capsuleEntries(entries, capsule.id);
  if (canReadEntries(capsule, nowIso)) return list;
  return list.filter(e => isMine(e, memberId));
}

export function filteredCapsules(capsules, view) {
  const active = ["open", "closed"];
  return capsules.filter(c => view === "active" ? active.includes(c.status) : !active.includes(c.status));
}

/**
 * Fields the in-app search matches against (see hub-sdk `searchMatch`).
 * The occasion and the writing prompt are searchable alongside the
 * title — capsules are remembered as "the one for Mia's 18th", which is
 * the occasion, not the title someone typed.
 */
export function searchableFields(item) {
  return [item.title, item.occasion, item.prompt, item.created_by_name];
}

/**
 * Whether a failed write may nonetheless have been stored ("retry after a lost
 * response"). No status: the request threw before any answer. A 400: the hub's
 * answer for a write that timed out after it may have been stored, and for a
 * retry that met the first try's row under its pinned id (UNIQUE_CONSTRAINT).
 * A 5xx other than 507: the hub failing on its side, possibly after the write.
 * Anything else (403, 404, 409, 413, 415, 429, 507) is a refusal that stored
 * nothing — the only case in which an upload made for the row may be deleted.
 */
export function outcomeUnknown(e) {
  if (e?.code === "UNIQUE_CONSTRAINT" || /UNIQUE constraint failed/i.test(String(e?.message ?? ""))) return true;
  const status = Number(e?.status) || 0;
  // Up to 400: no answer, a 2xx whose body could not be read as a result, or a 400.
  return status <= 400 || (status >= 500 && status !== 507);
}

/**
 * The line a failed write shows ("Refused, gone, or failed" in the app-template
 * guide): "try again" only when retrying can work, and never the hub's text.
 * `thing` and `action` are the app's own nouns. `found` is the caller's re-read
 * after a write that changed nothing: false = the row is gone, true = it is
 * still there (on a plain `WHERE id = ?` write the row policy narrowed it, the
 * permission line; on a `guarded` write its state moved), null = the re-read
 * itself failed. A `forUser` error keeps the message the app wrote for it.
 */
export function failureLine(e, { action, thing, found, guarded = false } = {}) {
  if (e?.forUser) return e.message;
  if (e?.code === "UNIQUE_CONSTRAINT" || /UNIQUE constraint failed/i.test(String(e?.message ?? ""))) return `That ${thing} already exists.`;
  if (e?.status === 403 || (found === true && !guarded)) return `You don’t have permission to ${action}.`;
  if (e?.status === 507) return "The household’s storage is full — free up space first.";
  if (e?.status === 429) return "Too many tries — wait a minute and try again.";
  if (found === null) return `Couldn’t ${action} — try again.`;
  if (found === false || (found === undefined && e?.status === 404)) return `This ${thing} has been removed.`;
  if (found === true || e?.status === 409) return `This ${thing} was changed by someone else — check it first.`;
  return `Couldn’t ${action} — try again.`;
}

/**
 * The line a failed upload shows. The hub's two refusals of the file itself get
 * a line of their own: 413 too large, 415 a type it does not take. The rest
 * (403, 429, 507, no answer or a 5xx) follows `failureLine`.
 */
export function uploadFailureLine(e, words) {
  if (e?.status === 413) return "That file is too large.";
  if (e?.status === 415) return "That kind of file can’t be uploaded.";
  return failureLine(e, words);
}
