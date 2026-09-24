import assert from "node:assert/strict";
import { test } from "node:test";
import {
  encryptToken, decryptToken, findAuthorizedLocation, getOwnReviewTotals,
  googleBusinessConfigured, listAuthorizedLocations, listOwnReviewsPage,
} from "../lib/googleBusiness.ts";

test("Google connection is offered only with a valid site URL and OAuth configuration", () => {
  const names = ["GOOGLE_BUSINESS_CLIENT_ID", "GOOGLE_BUSINESS_CLIENT_SECRET",
    "GOOGLE_TOKEN_ENCRYPTION_KEY", "NEXT_PUBLIC_SITE_URL"];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  try {
    process.env.GOOGLE_BUSINESS_CLIENT_ID = "client-id";
    process.env.GOOGLE_BUSINESS_CLIENT_SECRET = "client-secret";
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = "ab".repeat(32);
    process.env.NEXT_PUBLIC_SITE_URL = "https://reviewflow.example";
    assert.equal(googleBusinessConfigured(), true);
    process.env.NEXT_PUBLIC_SITE_URL = "not-a-url";
    assert.equal(googleBusinessConfigured(), false);
    delete process.env.NEXT_PUBLIC_SITE_URL;
    assert.equal(googleBusinessConfigured(), false);
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
});

test("refresh tokens are encrypted and authenticated", () => {
  const before = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = "ab".repeat(32);
  try {
    const encrypted = encryptToken("private-refresh-token");
    assert.equal(encrypted.includes("private-refresh-token"), false);
    assert.equal(decryptToken(encrypted), "private-refresh-token");
    const [iv, tag, ciphertext] = encrypted.split(".");
    const changedTag = `${tag[0] === "A" ? "B" : "A"}${tag.slice(1)}`;
    assert.throws(() => decryptToken(`${iv}.${changedTag}.${ciphertext}`));
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

test("authorized locations are listed across account and location pages", async () => {
  const original = global.fetch;
  global.fetch = async (url, options) => {
    const target = new URL(url);
    assert.equal(options.headers.Authorization, "Bearer owner-access");
    if (target.hostname === "mybusinessaccountmanagement.googleapis.com") {
      assert.equal(target.searchParams.get("pageSize"), "20");
      return Response.json(target.searchParams.get("pageToken") === "next-accounts"
        ? { accounts: [{ name: "accounts/2" }] }
        : { accounts: [{ name: "accounts/1" }], nextPageToken: "next-accounts" });
    }
    assert.equal(target.hostname, "mybusinessbusinessinformation.googleapis.com");
    assert.equal(target.searchParams.get("readMask"), "name,title,metadata");
    assert.equal(target.searchParams.get("pageSize"), "100");
    if (target.pathname.includes("accounts/1")) {
      return Response.json(target.searchParams.get("pageToken") === "next-locations"
        ? { locations: [{ name: "locations/b", title: "Segundo", metadata: { placeId: "place-b" } }] }
        : { locations: [
          { name: "locations/no-place", title: "Sin Place ID" },
          { name: "locations/a", title: "Primero", metadata: { placeId: "place-a" } },
        ], nextPageToken: "next-locations" });
    }
    return Response.json({ locations: [{ name: "locations/c", metadata: { placeId: "place-c" } }] });
  };
  try {
    assert.deepEqual(await listAuthorizedLocations("owner-access"), [
      { accountName: "accounts/1", locationName: "accounts/1/locations/a", placeId: "place-a", title: "Primero" },
      { accountName: "accounts/1", locationName: "accounts/1/locations/b", placeId: "place-b", title: "Segundo" },
      { accountName: "accounts/2", locationName: "accounts/2/locations/c", placeId: "place-c" },
    ]);
  } finally { global.fetch = original; }
});

test("own reviews are fetched live one page at a time without changing Google content", async () => {
  const original = global.fetch;
  const review = {
    name: "accounts/1/locations/2/reviews/3", reviewId: "3",
    reviewer: { displayName: "Cliente", profilePhotoUrl: "https://example.com/photo",
      isAnonymous: false, providerOnlyField: "hidden" },
    starRating: "FIVE", comment: "Atención excelente", createTime: "2026-09-20T12:00:00Z",
    updateTime: "2026-09-21T12:00:00Z",
    reviewReply: { comment: "Private owner reply" }, providerOnlyField: "hidden",
  };
  let calls = 0;
  global.fetch = async (url, options) => {
    calls++;
    const target = new URL(url);
    assert.equal(target.hostname, "mybusiness.googleapis.com");
    assert.equal(target.pathname, "/v4/accounts/1/locations/2/reviews");
    assert.equal(target.searchParams.get("pageSize"), "50");
    assert.equal(target.searchParams.get("orderBy"), "updateTime desc");
    assert.equal(target.searchParams.get("pageToken"), "opaque page token");
    assert.equal(options.headers.Authorization, "Bearer owner-access");
    assert.equal(options.cache, "no-store");
    return Response.json({ reviews: [review], averageRating: 4.7,
      totalReviewCount: 120, nextPageToken: "another-token" });
  };
  try {
    assert.deepEqual(await listOwnReviewsPage(
      "owner-access", "accounts/1/locations/2", "opaque page token",
    ), { reviews: [{
      name: review.name, reviewId: review.reviewId,
      reviewer: { displayName: "Cliente", profilePhotoUrl: "https://example.com/photo", isAnonymous: false },
      starRating: review.starRating, comment: review.comment,
      createTime: review.createTime, updateTime: review.updateTime,
    }], averageRating: 4.7, totalReviewCount: 120,
      nextPageToken: "another-token" });
    assert.equal(calls, 1);
    await assert.rejects(() => listOwnReviewsPage("owner-access", "invalid"), /INVALID_LOCATION_NAME/);
    await assert.rejects(() => listOwnReviewsPage("owner-access", "accounts/1/locations/2", ""),
      /INVALID_PAGE_TOKEN/);
    assert.equal(calls, 1);
  } finally { global.fetch = original; }
});
