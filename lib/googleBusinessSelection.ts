import jwt from "jsonwebtoken";
import { encryptToken } from "./googleBusiness.ts";

export const selectionCookieName = "reviewflow.google_selection";
export const selectionCookiePath = "/api/google-business/locations";
export const selectionMaxAgeSeconds = 600;

type PendingSelection = {
  profileId: string;
  placeIdAtStart: string | null;
  encryptedRefreshToken: string;
};

type ManagedLocation = {
  accountName: string;
  locationName: string;
  placeId: string;
  title?: string;
};

export function createPendingSelection(
  profileId: string,
  placeIdAtStart: string | null,
  refreshToken: string,
) {
  return jwt.sign({
    kind: "google_business_selection",
    profileId,
    placeIdAtStart,
    encryptedRefreshToken: encryptToken(refreshToken),
  }, process.env.NEXTAUTH_SECRET!, { expiresIn: selectionMaxAgeSeconds, algorithm: "HS256" });
}

export function readPendingSelection(
  ticket: string | undefined,
  profileId: string,
  currentPlaceId: string | null,
): PendingSelection | null {
  if (!ticket) return null;
  try {
    const value = jwt.verify(ticket, process.env.NEXTAUTH_SECRET!, { algorithms: ["HS256"] });
    if (typeof value === "string" || value.kind !== "google_business_selection" ||
        value.profileId !== profileId || value.placeIdAtStart !== currentPlaceId ||
        typeof value.encryptedRefreshToken !== "string") return null;
    return {
      profileId: value.profileId,
      placeIdAtStart: value.placeIdAtStart,
      encryptedRefreshToken: value.encryptedRefreshToken,
    };
  } catch { return null; }
}

export function chooseManagedLocation(locations: ManagedLocation[], locationName: unknown) {
  if (typeof locationName !== "string" || !/^accounts\/[^/]+\/locations\/[^/]+$/.test(locationName)) return null;
  return locations.find((location) => location.locationName === locationName) ?? null;
}

export function normalizeManagedBusinessTitle(title: unknown) {
  if (typeof title !== "string") return null;
  const normalized = title.normalize("NFKC").trim().replace(/\s+/gu, " ");
  if (!normalized || normalized.length > 160 || /[\u0000-\u001f\u007f]/u.test(normalized)) return null;
  return normalized;
}
