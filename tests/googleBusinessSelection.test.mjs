import assert from "node:assert/strict";
import { test } from "node:test";
import { chooseManagedLocation, createPendingSelection, normalizeManagedBusinessTitle,
  readPendingSelection } from "../lib/googleBusinessSelection.ts";

test("Google selection ticket is encrypted, bound to the profile and expires", () => {
  const previousJwt = process.env.NEXTAUTH_SECRET;
  const previousEncryption = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  process.env.NEXTAUTH_SECRET = "test-secret-for-selection-tickets";
  process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = "cd".repeat(32);
  try {
    const ticket = createPendingSelection("profile-1", null, "private-refresh-token");
    assert.equal(ticket.includes("private-refresh-token"), false);
    const pending = readPendingSelection(ticket, "profile-1", null);
    assert.equal(pending?.profileId, "profile-1");
    assert.equal(typeof pending?.encryptedRefreshToken, "string");
    assert.equal(pending?.encryptedRefreshToken.includes("private-refresh-token"), false);
    assert.equal(readPendingSelection(ticket, "profile-2", null), null);
    assert.equal(readPendingSelection(ticket, "profile-1", "different-place"), null);
    assert.equal(readPendingSelection(`${ticket.slice(0, -1)}x`, "profile-1", null), null);
  } finally {
    if (previousJwt === undefined) delete process.env.NEXTAUTH_SECRET;
    else process.env.NEXTAUTH_SECRET = previousJwt;
    if (previousEncryption === undefined) delete process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
    else process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = previousEncryption;
  }
});

test("only an enumerated managed location can be selected from multiple businesses", () => {
  const locations = [
    { accountName: "accounts/1", locationName: "accounts/1/locations/10", placeId: "place-one", title: "First" },
    { accountName: "accounts/2", locationName: "accounts/2/locations/20", placeId: "place-two", title: "Second" },
  ];
  assert.deepEqual(chooseManagedLocation(locations, "accounts/2/locations/20"), locations[1]);
  assert.equal(chooseManagedLocation(locations, "accounts/3/locations/30"), null);
  assert.equal(chooseManagedLocation(locations, "../../accounts/1/locations/10"), null);
  assert.equal(chooseManagedLocation(locations, { locationName: "accounts/1/locations/10" }), null);
});

test("managed business title is safe to show during selection", () => {
  assert.equal(normalizeManagedBusinessTitle("  Café\n del   Sol  "), "Café del Sol");
  assert.equal(normalizeManagedBusinessTitle("\u0000Bad"), null);
  assert.equal(normalizeManagedBusinessTitle("x".repeat(161)), null);
});

test("first binding needs confirmation; switching a bound business with history is blocked", async () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
  try {
    const { bindingBlockedByHistory, firstBindingNeedsConfirmation } = await import("../lib/businessIdentity.ts");
    assert.equal(bindingBlockedByHistory("place-one", "place-one", true), false);
    assert.equal(bindingBlockedByHistory("place-one", "place-two", true), true);
    assert.equal(bindingBlockedByHistory(null, "place-two", true), false);
    assert.equal(bindingBlockedByHistory(null, "place-two", false), false);
    assert.equal(firstBindingNeedsConfirmation(null, true), true);
    assert.equal(firstBindingNeedsConfirmation(null, false), false);
    assert.equal(firstBindingNeedsConfirmation("place-one", true), false);
  } finally {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
  }
});
