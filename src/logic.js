// Pure, testable logic extracted from index.html.
// No DOM, no network — safe to import from Node for unit tests.

export function nextYear(now = new Date()) {
  const d = new Date(now);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
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
