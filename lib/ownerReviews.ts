import { createHash } from "node:crypto";

export type OwnerReviewInput = { date: string; rating: number; text: string };
export type OwnerReviewImport = { sourceLabel: string; reviews: (OwnerReviewInput & { fingerprint: string })[] };

export function parseOwnerReviewImport(value: unknown, now = new Date()): OwnerReviewImport | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (body.rights_confirmed !== true || typeof body.source_label !== "string" ||
      body.source_label.trim().length < 3 || body.source_label.trim().length > 120 ||
      !Array.isArray(body.reviews) || body.reviews.length === 0 || body.reviews.length > 100) return null;
  const sourceLabel = body.source_label.trim();
  const reviews: OwnerReviewImport["reviews"] = [];
  const fingerprints = new Set<string>();
  const tomorrow = new Date(now.getTime() + 86_400_000).toISOString().slice(0, 10);
  for (const raw of body.reviews) {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Record<string, unknown>;
    if (typeof item.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(item.date) ||
        item.date < "2000-01-01" || item.date > tomorrow ||
        Number.isNaN(Date.parse(`${item.date}T00:00:00Z`)) ||
        new Date(`${item.date}T00:00:00Z`).toISOString().slice(0, 10) !== item.date ||
        typeof item.rating !== "number" || !Number.isInteger(item.rating) ||
        item.rating < 1 || item.rating > 5 || typeof item.text !== "string") return null;
    const text = item.text.normalize("NFKC").replace(/\s+/g, " ").trim();
    if (text.length < 5 || text.length > 2000) return null;
    const fingerprint = createHash("sha256")
      .update(JSON.stringify([item.date, item.rating, text])).digest("hex");
    if (fingerprints.has(fingerprint)) continue;
    fingerprints.add(fingerprint);
    reviews.push({ date: item.date, rating: item.rating, text, fingerprint });
  }
  return { sourceLabel, reviews };
}
