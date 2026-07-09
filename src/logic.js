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

export function canReadEntries(capsule) {
  return ["revealed", "archived"].includes(capsule?.status);
}

export function isMine(entry, memberId) {
  return entry.member_id === memberId;
}

// Everyone can read once revealed/archived; before that a member sees only their own.
export function visibleEntries(entries, capsule, memberId) {
  const list = capsuleEntries(entries, capsule.id);
  if (canReadEntries(capsule)) return list;
  return list.filter(e => isMine(e, memberId));
}

export function filteredCapsules(capsules, view) {
  const active = ["open", "closed"];
  return capsules.filter(c => view === "active" ? active.includes(c.status) : !active.includes(c.status));
}
