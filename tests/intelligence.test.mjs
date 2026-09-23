import test from "node:test";
import assert from "node:assert/strict";
import { summarizeMetrics, buildInsights } from "../lib/metrics.ts";
import { analyzeReviews } from "../lib/reviews.ts";
import { generateAlertsFromSnapshots } from "../lib/alerts.ts";
import { hasFreshCapture, weeklyDigest } from "../lib/digest.ts";

const now = new Date("2026-09-23T12:00:00Z");
const point = (day, rating, review_count) => ({
  rating, review_count, created_at: `2026-09-${String(day).padStart(2, "0")}T12:00:00Z`,
});

test("weekly growth uses an observed baseline, not an invented zero", () => {
  const result = summarizeMetrics([point(22, 4.4, 103), point(15, 4.3, 100)], now);
  assert.equal(result.reviewChange, 3);
  assert.equal(result.reviewsGained7d, 3);
  assert.equal(summarizeMetrics([point(22, 4.4, 103)], now).reviewsGained7d, null);
});

test("missing rating is not interpreted as a rating drop", () => {
  const result = summarizeMetrics([point(22, null, 103), point(15, 4.3, 100)], now);
  assert.equal(result.ratingChange, null);
  assert.equal(result.reviewChange, 3);
});

test("competitive insight requires comparable weekly observations", () => {
  const own = summarizeMetrics([point(22, 4.3, 103), point(15, 4.4, 100)], now);
  const competitor = { id: 1, name: "Estudio Norte", placeId: "demo",
    ...summarizeMetrics([point(22, 4.6, 130), point(15, 4.5, 110)], now) };
  assert.match(buildInsights(own, [competitor]).join(" "), /Estudio Norte ganó más reseñas/);
});

test("review topics are counted once per review and negative topics use low ratings", () => {
  const result = analyzeReviews([
    { id: "1", subject: "own", businessName: "Demo", rating: 2,
      text: "Mucha espera y el precio caro", publishedAt: "2026-09-20", source: "demo" },
    { id: "2", subject: "own", businessName: "Demo", rating: 5,
      text: "Buen precio y atención", publishedAt: "2026-09-21", source: "demo" },
  ]);
  assert.equal(result.topicCounts.precio, 2);
  assert.equal(result.negativeCount, 1);
  assert.deepEqual(result.negativeTopics.sort(), ["espera", "precio"]);
});

test("missing observations do not create artificial rating alerts", () => {
  const alerts = generateAlertsFromSnapshots({
    profile_id: "profile", subject_type: "own", subject_place_id: "place",
    previous: { place_id: "place", rating: 4.5, review_count: 100 },
    current: { place_id: "place", rating: null, review_count: 101 },
  });
  assert.deepEqual(alerts.map((alert) => alert.type), ["review_increase"]);
});

test("weekly digest escapes profile and competitor names", () => {
  const summary = summarizeMetrics([point(22, 4.3, 103), point(15, 4.4, 100)], now);
  const digest = weeklyDigest({
    businessName: "<Negocio>", placeId: null, previousVisitAt: null,
    own: summary,
    competitors: [{ id: 1, name: "<Competidor>", placeId: "test", ...summary }],
    changes: [], insights: [],
  }, "https://example.com/dashboard");
  assert.match(digest.html, /&lt;Negocio&gt;/);
  assert.match(digest.html, /&lt;Competidor&gt;/);
  assert.doesNotMatch(digest.html, /<Competidor>/);
});

test("weekly digest skips stale captures", () => {
  const old = summarizeMetrics([point(8, 4.3, 103)], now);
  const overview = { businessName: "Demo", placeId: null, previousVisitAt: null,
    own: old, competitors: [], changes: [], insights: [] };
  assert.equal(hasFreshCapture(overview, "2026-09-16T12:00:00Z"), false);
  assert.equal(hasFreshCapture({ ...overview, own: summarizeMetrics([point(22, 4.3, 103)], now) },
    "2026-09-16T12:00:00Z"), true);
});
