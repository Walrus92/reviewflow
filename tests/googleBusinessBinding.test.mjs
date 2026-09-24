import assert from "node:assert/strict";
import { test } from "node:test";
import { saveGoogleBusinessBinding } from "../lib/googleBusinessBinding.ts";

test("a failed first connection insert leaves the profile and selection untouched", async () => {
  const calls = [];
  let placeId = null;
  let selectionAvailable = true;
  const result = await saveGoogleBusinessBinding(true, {
    insertConnection: async () => { calls.push("insert"); return "error"; },
    upsertConnection: async () => { throw new Error("must not upsert"); },
    updateProfile: async () => { placeId = "place-a"; throw new Error("must not update"); },
    removeInsertedConnection: async () => { selectionAvailable = false; throw new Error("must not delete"); },
  });
  assert.deepEqual(result, { status: "connection_save_failed" });
  assert.deepEqual(calls, ["insert"]);
  assert.equal(placeId, null);
  assert.equal(selectionAvailable, true);
});

test("a failed profile compare-and-swap removes the newly inserted connection", async () => {
  const calls = [];
  let connection = null;
  const inserted = { placeId: "place-a", token: "encrypted-a", connectedAt: "2026-09-25T10:00:00.000Z" };
  const result = await saveGoogleBusinessBinding(true, {
    insertConnection: async () => { calls.push("insert"); connection = inserted; return "saved"; },
    upsertConnection: async () => { throw new Error("must not upsert"); },
    updateProfile: async () => { calls.push("compare-and-swap"); return "conflict"; },
    removeInsertedConnection: async () => {
      calls.push("conditional-delete");
      if (connection === inserted) connection = null;
      return true;
    },
  });
  assert.deepEqual(calls, ["insert", "compare-and-swap", "conditional-delete"]);
  assert.deepEqual(result, { status: "business_identity_changed", cleanupFailed: false });
  assert.equal(connection, null);
});

test("rollback does not erase a newer OAuth connection", async () => {
  let connection = null;
  const inserted = { placeId: "place-a", token: "encrypted-a", connectedAt: "2026-09-25T10:00:00.000Z" };
  const newer = { placeId: "place-a", token: "encrypted-b", connectedAt: "2026-09-25T10:00:01.000Z" };
  const result = await saveGoogleBusinessBinding(true, {
    insertConnection: async () => { connection = inserted; return "saved"; },
    upsertConnection: async () => { throw new Error("must not upsert"); },
    updateProfile: async () => { connection = newer; return "conflict"; },
    removeInsertedConnection: async () => {
      if (connection === inserted) connection = null;
      return true;
    },
  });
  assert.deepEqual(result, { status: "business_identity_changed", cleanupFailed: false });
  assert.equal(connection, newer);
});

test("a successful first binding inserts before changing identity; same-place reconnection only upserts", async () => {
  const calls = [];
  const actions = {
    insertConnection: async () => { calls.push("insert"); return "saved"; },
    upsertConnection: async () => { calls.push("upsert"); return true; },
    updateProfile: async () => { calls.push("compare-and-swap"); return "updated"; },
    removeInsertedConnection: async () => { calls.push("delete"); return true; },
  };
  assert.deepEqual(await saveGoogleBusinessBinding(true, actions), { status: "connected" });
  assert.deepEqual(calls, ["insert", "compare-and-swap"]);
  calls.length = 0;
  assert.deepEqual(await saveGoogleBusinessBinding(false, actions), { status: "connected" });
  assert.deepEqual(calls, ["upsert"]);
});

test("an unexpected profile update error also tries to remove the new connection", async () => {
  const calls = [];
  const result = await saveGoogleBusinessBinding(true, {
    insertConnection: async () => { calls.push("insert"); return "saved"; },
    upsertConnection: async () => { throw new Error("must not upsert"); },
    updateProfile: async () => { calls.push("compare-and-swap"); throw new Error("temporary failure"); },
    removeInsertedConnection: async () => { calls.push("conditional-delete"); return true; },
  });
  assert.deepEqual(calls, ["insert", "compare-and-swap", "conditional-delete"]);
  assert.deepEqual(result, { status: "profile_update_failed", cleanupFailed: false });
});
