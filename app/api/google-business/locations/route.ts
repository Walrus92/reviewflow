import { NextRequest, NextResponse } from "next/server";
import { bindingBlockedByHistory, firstBindingNeedsConfirmation, hasBusinessHistory } from "@/lib/businessIdentity";
import { saveGoogleBusinessBinding } from "@/lib/googleBusinessBinding";
import { listAuthorizedLocations, googleBusinessConfigured, refreshAccessToken } from "@/lib/googleBusiness";
import { chooseManagedLocation, normalizeManagedBusinessTitle, readPendingSelection,
  selectionCookieName, selectionCookiePath } from "@/lib/googleBusinessSelection";
import { requireProfile } from "@/lib/requestAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function clearSelectionCookie(response: NextResponse, request: NextRequest) {
  response.cookies.set(selectionCookieName, "", {
    httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax",
    maxAge: 0, path: selectionCookiePath,
  });
  return response;
}

async function pendingLocations(request: NextRequest) {
  const auth = await requireProfile(request);
  if (auth.error) return { error: auth.error };
  if (!googleBusinessConfigured()) {
    return { error: NextResponse.json({ error: "GOOGLE_BUSINESS_NOT_CONFIGURED" }, { status: 503 }) };
  }
  const pending = readPendingSelection(
    request.cookies.get(selectionCookieName)?.value, auth.profile.id, auth.profile.place_id,
  );
  if (!pending) {
    return { error: NextResponse.json({ error: "GOOGLE_SELECTION_EXPIRED" }, { status: 401 }) };
  }
  try {
    const accessToken = await refreshAccessToken(pending.encryptedRefreshToken);
    const locations = await listAuthorizedLocations(accessToken);
    return { profile: auth.profile, pending, locations };
  } catch (cause) {
    console.error("GOOGLE_MANAGED_LOCATIONS_FAILED", cause);
    return { error: NextResponse.json({ error: "GOOGLE_LOCATIONS_FAILED" }, { status: 502 }) };
  }
}

export async function GET(request: NextRequest) {
  const result = await pendingLocations(request);
  if (result.error) return result.error;
  return NextResponse.json({
    locations: result.locations.map((location) => ({
      accountName: location.accountName,
      locationName: location.locationName,
      placeId: location.placeId,
      title: normalizeManagedBusinessTitle(location.title),
    })),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  }
  const result = await pendingLocations(request);
  if (result.error) return result.error;
  const body: unknown = await request.json().catch(() => null);
  const requestedLocation = typeof body === "object" && body !== null && "locationName" in body
    ? body.locationName : null;
  const confirmedExistingBusiness = typeof body === "object" && body !== null &&
    "confirmExistingBusiness" in body && body.confirmExistingBusiness === true;
  const selected = chooseManagedLocation(result.locations, requestedLocation);
  if (!selected) return NextResponse.json({ error: "LOCATION_NOT_MANAGED" }, { status: 403 });

  const currentPlaceId = result.profile.place_id;
  if (currentPlaceId !== selected.placeId) {
    try {
      const hasHistory = await hasBusinessHistory(result.profile.id);
      if (firstBindingNeedsConfirmation(currentPlaceId, hasHistory) && !confirmedExistingBusiness) {
        return NextResponse.json({ error: "BUSINESS_BINDING_CONFIRMATION_REQUIRED" }, { status: 409 });
      }
      if (bindingBlockedByHistory(currentPlaceId, selected.placeId, hasHistory)) {
        return NextResponse.json({ error: "BUSINESS_IDENTITY_LOCKED" }, { status: 409 });
      }
    } catch {
      return NextResponse.json({ error: "PROFILE_HISTORY_LOOKUP_FAILED" }, { status: 500 });
    }
  }

  const connectionValues = {
    profile_id: result.profile.id,
    place_id: selected.placeId,
    account_name: selected.accountName,
    location_name: selected.locationName,
    refresh_token_encrypted: result.pending.encryptedRefreshToken,
    connected_at: new Date().toISOString(),
    last_error: null,
  };
  const binding = await saveGoogleBusinessBinding(currentPlaceId !== selected.placeId, {
    insertConnection: async () => {
      const saved = await supabaseAdmin.from("google_business_connections").insert(connectionValues);
      if (!saved.error) return "saved";
      console.error("GOOGLE_BUSINESS_SELECTION_SAVE_FAILED", saved.error);
      return saved.error.code === "23505" ? "conflict" : "error";
    },
    upsertConnection: async () => {
      const saved = await supabaseAdmin.from("google_business_connections")
        .upsert(connectionValues, { onConflict: "profile_id" });
      if (saved.error) console.error("GOOGLE_BUSINESS_SELECTION_SAVE_FAILED", saved.error);
      return !saved.error;
    },
    updateProfile: async () => {
      let update = supabaseAdmin.from("profiles")
        .update({ place_id: selected.placeId }).eq("id", result.profile.id);
      update = currentPlaceId === null ? update.is("place_id", null) : update.eq("place_id", currentPlaceId);
      const changed = await update.select("id").maybeSingle();
      if (changed.error) {
        console.error("GOOGLE_BUSINESS_PROFILE_UPDATE_FAILED", changed.error);
        return "error";
      }
      return changed.data ? "updated" : "conflict";
    },
    removeInsertedConnection: async () => {
      const removed = await supabaseAdmin.from("google_business_connections").delete()
        .eq("profile_id", result.profile.id)
        .eq("place_id", selected.placeId)
        .eq("refresh_token_encrypted", result.pending.encryptedRefreshToken)
        .eq("connected_at", connectionValues.connected_at);
      if (removed.error) console.error("GOOGLE_BUSINESS_BINDING_CLEANUP_FAILED", removed.error);
      return !removed.error;
    },
  });
  if (binding.cleanupFailed) console.error("GOOGLE_BUSINESS_BINDING_RECOVERY_REQUIRED", result.profile.id);
  if (binding.status !== "connected") {
    const error = binding.status === "connection_conflict" || binding.status === "business_identity_changed"
      ? "BUSINESS_IDENTITY_CHANGED" : binding.status === "profile_update_failed"
        ? "PROFILE_UPDATE_FAILED" : "CONNECTION_SAVE_FAILED";
    const status = error === "BUSINESS_IDENTITY_CHANGED" ? 409 : 500;
    return NextResponse.json({ error }, { status });
  }
  return clearSelectionCookie(NextResponse.json({
    connected: true, placeId: selected.placeId, locationName: selected.locationName,
  }, { headers: { "Cache-Control": "no-store" } }), request);
}
