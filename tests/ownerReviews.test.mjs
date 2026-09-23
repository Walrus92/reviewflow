import assert from "node:assert/strict";
import { test } from "node:test";
import { parseReviewCsv } from "../lib/reviewCsv.ts";
import { parseOwnerReviewImport } from "../lib/ownerReviews.ts";
import { ownReviewFindings } from "../lib/findings.ts";

const now = new Date("2026-09-24T12:00:00Z");

test("CSV parser accepts quoted commas and line breaks", () => {
  const rows = parseReviewCsv('fecha,estrellas,texto\r\n2026-09-20,2,"Esperé, pero nadie vino"\r\n2026-09-21,5,"Muy buen\ntrato"\r\n');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].text, "Esperé, pero nadie vino");
  assert.equal(rows[1].text, "Muy buen\ntrato");
  assert.equal(parseReviewCsv('fecha;estrellas;texto\n2026-09-20;5;"Amable; rápido"')[0].text, "Amable; rápido");
  assert.throws(() => parseReviewCsv("rating,text\n5,bien"), /primera fila/);
});

test("import requires rights, valid dates and stable deduplication", () => {
  const review = { date: "2026-09-20", rating: 2, text: "Esperé media hora" };
  const input = { source_label: "Exportación propia", rights_confirmed: true, reviews: [review, review] };
  const parsed = parseOwnerReviewImport(input, now);
  assert.equal(parsed?.reviews.length, 1);
  assert.match(parsed.reviews[0].fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(parseOwnerReviewImport({ ...input, rights_confirmed: false }, now), null);
  assert.equal(parseOwnerReviewImport({ ...input, reviews: [{ ...review, date: "2026-02-30" }] }, now), null);
  assert.equal(parseOwnerReviewImport({ ...input, reviews: [{ ...review, rating: 0 }] }, now), null);
});

test("own review signals require repeated examples and do not claim a proven cause", () => {
  const item = (id, rating, text) => ({ id, rating, text, subject: "own",
    businessName: "Mi negocio", publishedAt: "2026-09-20", source: "authorized" });
  const reviews = [
    item("1", 2, "Esperé demasiado para ser atendido"),
    item("2", 1, "Servicio lento y mucha espera"),
    item("3", 5, "Atención amable"),
    item("4", 5, "Muy buen trato"),
  ];
  const findings = ownReviewFindings(reviews);
  assert.deepEqual(findings.map((finding) => finding.id), ["own-waiting", "own-service-praise"]);
  assert.match(findings[0].evidence[1], /Esperé demasiado/);
  assert.match(findings[0].caveat, /no miden/);
  assert.deepEqual(ownReviewFindings(reviews.slice(0, 1)), []);
});
