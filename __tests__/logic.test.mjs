import { describe, it, expect } from "vitest";
import {
  nextYear, fmtDate, statusLabel, capsuleEntries, entryAttachments,
  memberById, canAddEntry, canReadEntries, effectiveStatus, isMine, visibleEntries, filteredCapsules,
} from "../src/logic.js";

describe("nextYear", () => {
  it("advances the year against an injected now", () => {
    expect(nextYear(new Date("2026-07-08T12:00:00"))).toBe("2027-07-08");
  });
});

describe("fmtDate", () => {
  it("empty for falsy, formatted otherwise", () => {
    expect(fmtDate("")).toBe("");
    expect(fmtDate("2026-07-08")).toBe("Jul 8, 2026");
  });
});

describe("statusLabel", () => {
  it("maps statuses", () => {
    expect(statusLabel("open")).toBe("Open");
    expect(statusLabel("closed")).toBe("Sealed");
    expect(statusLabel("revealed")).toBe("Revealed");
    expect(statusLabel("archived")).toBe("Archived");
    expect(statusLabel("weird")).toBe("Archived");
  });
});

describe("capsuleEntries / entryAttachments", () => {
  const entries = [
    { id: "b", capsule_id: "c1", created_at: "2026-01-02" },
    { id: "a", capsule_id: "c1", created_at: "2026-01-01" },
    { id: "x", capsule_id: "c2", created_at: "2026-01-01" },
  ];
  it("filters by capsule, sorted by created_at asc", () => {
    expect(capsuleEntries(entries, "c1").map(e => e.id)).toEqual(["a", "b"]);
  });
  it("filters attachments by entry", () => {
    const atts = [{ id: "1", entry_id: "e1", created_at: "b" }, { id: "2", entry_id: "e1", created_at: "a" }];
    expect(entryAttachments(atts, "e1").map(a => a.id)).toEqual(["2", "1"]);
  });
});

describe("memberById", () => {
  it("resolves and defaults to null", () => {
    expect(memberById([{ id: "m" }], "m").id).toBe("m");
    expect(memberById([], "m")).toBe(null);
  });
});

describe("capsule state gates", () => {
  it("canAddEntry only when open", () => {
    expect(canAddEntry({ status: "open" })).toBe(true);
    expect(canAddEntry({ status: "closed" })).toBe(false);
  });
  it("canReadEntries only when revealed/archived", () => {
    expect(canReadEntries({ status: "revealed" })).toBe(true);
    expect(canReadEntries({ status: "archived" })).toBe(true);
    expect(canReadEntries({ status: "open" })).toBe(false);
  });
});

describe("clock-based reveal (mirrors sealed_until visible_after_parent_column)", () => {
  const now = "2026-07-09T12:00:00.000Z";
  it("releases a still-sealed capsule once its reveal date has arrived", () => {
    expect(canReadEntries({ status: "closed", reveal_date: "2026-07-09" }, now)).toBe(true);
    expect(canReadEntries({ status: "open", reveal_date: "2026-07-09" }, now)).toBe(true);
  });
  it("keeps a future-dated capsule sealed", () => {
    expect(canReadEntries({ status: "closed", reveal_date: "2026-07-10" }, now)).toBe(false);
    expect(canReadEntries({ status: "open", reveal_date: "2027-01-01" }, now)).toBe(false);
  });
  it("a missing reveal date never releases by clock", () => {
    expect(canReadEntries({ status: "closed" }, now)).toBe(false);
    expect(canReadEntries({ status: "closed", reveal_date: "" }, now)).toBe(false);
  });
  it("effectiveStatus reports 'revealed' once the date passes, else the raw status", () => {
    expect(effectiveStatus({ status: "closed", reveal_date: "2026-07-09" }, now)).toBe("revealed");
    expect(effectiveStatus({ status: "closed", reveal_date: "2026-07-10" }, now)).toBe("closed");
    expect(effectiveStatus({ status: "open", reveal_date: "2026-07-10" }, now)).toBe("open");
    expect(effectiveStatus({ status: "archived", reveal_date: "2020-01-01" }, now)).toBe("archived");
  });
  it("visibleEntries opens all entries once the reveal date arrives", () => {
    const entries = [
      { id: "mine", capsule_id: "c1", member_id: "me", created_at: "1" },
      { id: "theirs", capsule_id: "c1", member_id: "you", created_at: "2" },
    ];
    const sealed = visibleEntries(entries, { id: "c1", status: "closed", reveal_date: "2026-07-10" }, "me", now);
    expect(sealed.map(e => e.id)).toEqual(["mine"]);
    const released = visibleEntries(entries, { id: "c1", status: "closed", reveal_date: "2026-07-09" }, "me", now);
    expect(released.map(e => e.id)).toEqual(["mine", "theirs"]);
  });
});

describe("isMine / visibleEntries", () => {
  const entries = [
    { id: "mine", capsule_id: "c1", member_id: "me", created_at: "1" },
    { id: "theirs", capsule_id: "c1", member_id: "you", created_at: "2" },
  ];
  it("isMine compares member", () => {
    expect(isMine({ member_id: "me" }, "me")).toBe(true);
    expect(isMine({ member_id: "you" }, "me")).toBe(false);
  });
  it("before reveal a member sees only their own", () => {
    const out = visibleEntries(entries, { id: "c1", status: "open" }, "me");
    expect(out.map(e => e.id)).toEqual(["mine"]);
  });
  it("after reveal all entries are visible", () => {
    const out = visibleEntries(entries, { id: "c1", status: "revealed" }, "me");
    expect(out.map(e => e.id)).toEqual(["mine", "theirs"]);
  });
});

describe("filteredCapsules", () => {
  const capsules = [
    { id: "1", status: "open" },
    { id: "2", status: "closed" },
    { id: "3", status: "revealed" },
    { id: "4", status: "archived" },
  ];
  it("active view shows open + closed", () => {
    expect(filteredCapsules(capsules, "active").map(c => c.id)).toEqual(["1", "2"]);
  });
  it("other view shows revealed + archived", () => {
    expect(filteredCapsules(capsules, "revealed").map(c => c.id)).toEqual(["3", "4"]);
  });
});
