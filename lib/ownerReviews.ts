import { createHash } from "node:crypto";

export type OwnerReviewInput = { date: string; rating: number; text: string; id?: string };
export type OwnerReviewImport = { sourceLabel: string; reviews: (OwnerReviewInput & { fingerprint: string })[] };

export function oldestRetainedReviewDate(now = new Date()) {
  return new Date(now.getTime() - 89 * 86_400_000).toISOString().slice(0, 10);
}

export function parseOwnerReviewImport(value: unknown, now = new Date()): OwnerReviewImport | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (body.rights_confirmed !== true || typeof body.source_label !== "string" ||
      body.source_label.trim().length < 3 || body.source_label.trim().length > 120 ||
      !Array.isArray(body.reviews) || body.reviews.length === 0 || body.reviews.length > 100) return null;
  const sourceLabel = body.source_label.trim();
  const reviews: OwnerReviewImport["reviews"] = [];
  const fingerprints = new Map<string, string>();
  const today = now.toISOString().slice(0, 10);
  const oldest = oldestRetainedReviewDate(now);
  for (const raw of body.reviews) {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Record<string, unknown>;
    if (typeof item.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(item.date) ||
        item.date < oldest || item.date > today ||
        Number.isNaN(Date.parse(`${item.date}T00:00:00Z`)) ||
        new Date(`${item.date}T00:00:00Z`).toISOString().slice(0, 10) !== item.date ||
        typeof item.rating !== "number" || !Number.isInteger(item.rating) ||
        item.rating < 1 || item.rating > 5 || typeof item.text !== "string" ||
        (item.id !== undefined && (typeof item.id !== "string" || item.id.trim().length > 200))) return null;
    const text = item.text.normalize("NFKC").replace(/\s+/g, " ").trim();
    if (text.length < 5 || text.length > 2000) return null;
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(id ? ["source_id", sourceLabel.toLowerCase(), id] :
        ["content", item.date, item.rating, text])).digest("hex");
    const payload = JSON.stringify([item.date, item.rating, text]);
    if (fingerprints.has(fingerprint)) {
      if (fingerprints.get(fingerprint) !== payload) return null;
      continue;
    }
    fingerprints.set(fingerprint, payload);
    reviews.push({ date: item.date, rating: item.rating, text, fingerprint,
      ...(id ? { id } : {}) });
  }
  return { sourceLabel, reviews };
}
