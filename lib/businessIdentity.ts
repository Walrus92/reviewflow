import { supabaseAdmin } from "./supabaseAdmin.ts";

type BusinessIdentity = { place_id: string | null; business_name: string | null };

function normalizedBusinessName(value: string | null) {
  return value?.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("es") ?? "";
}

export function businessIdentityChanged(current: BusinessIdentity, next: BusinessIdentity) {
  const currentPlaceId = current.place_id?.trim() || null;
  const nextPlaceId = next.place_id?.trim() || null;
  if (currentPlaceId !== nextPlaceId) return true;
  return !currentPlaceId && normalizedBusinessName(current.business_name) !== normalizedBusinessName(next.business_name);
}

export function bindingBlockedByHistory(currentPlaceId: string | null, selectedPlaceId: string, hasHistory: boolean) {
  return hasHistory && Boolean(currentPlaceId?.trim()) && currentPlaceId?.trim() !== selectedPlaceId;
}

export function firstBindingNeedsConfirmation(currentPlaceId: string | null, hasHistory: boolean) {
  return hasHistory && !currentPlaceId?.trim();
}

export async function hasBusinessHistory(profileId: string) {
  const results = await Promise.all([
    supabaseAdmin.from("review_snapshots").select("id").eq("profile_id", profileId).limit(1),
    supabaseAdmin.from("owner_reviews").select("id").eq("profile_id", profileId).limit(1),
    supabaseAdmin.from("competitor_relations").select("id").eq("profile_id", profileId).limit(1),
    supabaseAdmin.from("competitors").select("id").eq("profile_id", profileId).limit(1),
    supabaseAdmin.from("competitor_snapshots").select("id").eq("source_profile_id", profileId).limit(1),
    supabaseAdmin.from("alerts").select("id").eq("profile_id", profileId).limit(1),
    supabaseAdmin.from("google_business_connections").select("profile_id").eq("profile_id", profileId).limit(1),
  ]);
  if (results.some((result) => result.error)) throw new Error("PROFILE_HISTORY_LOOKUP_FAILED");
  return results.some((result) => Boolean(result.data?.length));
}
