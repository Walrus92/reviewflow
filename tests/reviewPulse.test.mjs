import assert from "node:assert/strict";
import { test } from "node:test";
import { buildReviewPulse, reviewTrendFindings } from "../lib/reviewPulse.ts";
import { ownReviewFindings } from "../lib/findings.ts";

const now = new Date("2026-09-24T12:00:00Z");
const review = (id, publishedAt, rating, text) => ({
  id, publishedAt, rating, text, subject: "own", businessName: "Ejemplo", source: "owner_declared",
});

test("review activity uses publication date and a previous visit conservatively", () => {
  const rows = [
    review("1", "2026-09-24", 2, "Servicio lento"),
    review("2", "2026-09-22", 5, "Buen trato"),
    review("3", "2026-09-17", 4, "Buen resultado"),
  ];
  assert.deepEqual(buildReviewPulse(rows, now, "2026-09-22T09:00:00Z"), {
    countRecent7d: 2, countSinceVisit: 1, lastPublishedAt: "2026-09-24",
  });
  assert.equal(buildReviewPulse(rows, now, null).countSinceVisit, null);
});

test("a topic trend requires both periods and a clear difference", () => {
  const rows = [
    review("p1", "2026-08-10", 5, "Bien"),
    review("p2", "2026-08-11", 5, "Bien"),
    review("p3", "2026-08-12", 5, "Bien"),
    review("c1", "2026-09-20", 1, "Esperé demasiado"),
    review("c2", "2026-09-21", 2, "Servicio lento"),
    review("c3", "2026-09-22", 5, "Buen trabajo"),
  ];
  const findings = reviewTrendFindings(rows, now);
  assert.deepEqual(findings.map((item) => item.id), ["review-trend-waiting"]);
  assert.match(findings[0].evidence[0], /2 de 3.*0 de 3/);
  assert.match(findings[0].evidence[1], /2026-09-20/);
  assert.deepEqual(reviewTrendFindings(rows.slice(3), now), []);
  assert.deepEqual(reviewTrendFindings(rows, now, true), []);
});

test("negated wait and negative care wording do not become positive signals", () => {
  const rows = [
    review("1", "2026-09-20", 1, "No tuve que esperar, pero el precio era alto"),
    review("2", "2026-09-21", 2, "Sin espera, aunque el resultado fue malo"),
    review("3", "2026-09-22", 5, "Atención pésima, ironía total"),
    review("4", "2026-09-23", 5, "Mal trato, pero cinco estrellas por otro motivo"),
  ];
  assert.deepEqual(ownReviewFindings(rows), []);
});

test("hours signal recognizes late opening but not a neutral mention of opening hours", () => {
  const rows = [
    review("1", "2026-09-20", 1, "Abrieron tarde otra vez"),
    review("2", "2026-09-21", 2, "El horario publicado no coincide con la realidad"),
    review("3", "2026-09-22", 1, "El horario es amplio, pero el producto fue malo"),
  ];
  const hours = ownReviewFindings(rows).find((finding) => finding.id === "opening-hours");
  assert.ok(hours);
  assert.match(hours.evidence[0], /^2 de 3/);
});
