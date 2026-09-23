import assert from "node:assert/strict";
import { test } from "node:test";
import {
  encryptToken, decryptToken, findAuthorizedLocation, getOwnReviewTotals,
} from "../lib/googleBusiness.ts";

test("refresh tokens are encrypted and authenticated", () => {
  const before = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = "ab".repeat(32);
  try {
    const encrypted = encryptToken("private-refresh-token");
    assert.equal(encrypted.includes("private-refresh-token"), false);
    assert.equal(decryptToken(encrypted), "private-refresh-token");
    assert.throws(() => decryptToken(encrypted.slice(0, -1) + "x"));
  } finally {
    if (before === undefined) delete process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
    else process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = before;
  }
});

test("only a location with the saved Place ID may be connected", async () => {
  const original = global.fetch;
  global.fetch = async (url) => {
    const target = new URL(url);
    if (target.hostname === "mybusinessaccountmanagement.googleapis.com") {
      return Response.json({ accounts: [{ name: "accounts/123" }] });
    }
    if (target.hostname === "mybusinessbusinessinformation.googleapis.com") {
      assert.equal(target.searchParams.get("readMask"), "name,title,metadata");
      return Response.json({ locations: [
        { name: "locations/wrong", metadata: { placeId: "wrong" } },
        { name: "locations/right", metadata: { placeId: "matching-place" } },
      ] });
    }
    throw new Error("unexpected request");
  };
  try {
    assert.deepEqual(await findAuthorizedLocation("test-access", "matching-place"), {
      accountName: "accounts/123", locationName: "accounts/123/locations/right",
    });
    assert.equal(await findAuthorizedLocation("test-access", "unknown"), null);
  } finally { global.fetch = original; }
});

test("review totals are validated and review text is not returned", async () => {
  const original = global.fetch;
  global.fetch = async (url) => {
    assert.equal(new URL(url).searchParams.get("pageSize"), "1");
    return Response.json({ averageRating: 4.6, totalReviewCount: 37, reviews: [{ comment: "Private text" }] });
  };
  try {
    assert.deepEqual(await getOwnReviewTotals("test-access", "accounts/123/locations/right"),
      { rating: 4.6, reviewCount: 37 });
    await assert.rejects(() => getOwnReviewTotals("test-access", "invalid"));
  } finally { global.fetch = original; }
});
