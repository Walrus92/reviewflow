export type ManualCaptureInput = {
  subjectType: "own" | "competitor";
  competitorId: number | null;
  rating: number;
  reviewCount: number;
};

export function parseManualCapture(value: unknown): ManualCaptureInput | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const subjectType = input.subject_type;
  const competitorId = input.competitor_id;
  const rating = input.rating;
  const reviewCount = input.review_count;
  if (subjectType !== "own" && subjectType !== "competitor") return null;
  if (subjectType === "competitor" &&
      (typeof competitorId !== "number" || !Number.isSafeInteger(competitorId) || competitorId <= 0)) return null;
  if (typeof rating !== "number" || !Number.isFinite(rating) || rating < 0 || rating > 5 ||
      Math.abs(Math.round(rating * 100) - rating * 100) > 1e-8) return null;
  if (typeof reviewCount !== "number" || !Number.isSafeInteger(reviewCount) || reviewCount < 0) return null;
  return { subjectType, competitorId: subjectType === "competitor" ? competitorId as number : null,
    rating, reviewCount };
}

export function manualCaptureKey(profileId: string, input: ManualCaptureInput, now: Date): string {
  const subject = input.subjectType === "own" ? "own" : `competitor:${input.competitorId}`;
  return `manual_owner:${profileId}:${subject}:${now.toISOString().slice(0, 10)}`;
}
