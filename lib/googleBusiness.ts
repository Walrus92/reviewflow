import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const scope = "https://www.googleapis.com/auth/business.manage";

export function googleBusinessConfigured() {
  return Boolean(process.env.GOOGLE_BUSINESS_CLIENT_ID && process.env.GOOGLE_BUSINESS_CLIENT_SECRET &&
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY && /^[a-f\d]{64}$/i.test(process.env.GOOGLE_TOKEN_ENCRYPTION_KEY));
}

export function googleRedirectUri() {
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (!base) throw new Error("SITE_URL_MISSING");
  return new URL("/api/google-business/callback", base).toString();
}

export function googleAuthorizeUrl(state: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_BUSINESS_CLIENT_ID!);
  url.searchParams.set("redirect_uri", googleRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scope);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

export function encryptToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(process.env.GOOGLE_TOKEN_ENCRYPTION_KEY!, "hex"), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".");
}

export function decryptToken(value: string) {
  const [iv, tag, ciphertext] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  if (!iv || !tag || !ciphertext || iv.length !== 12 || tag.length !== 16) throw new Error("INVALID_TOKEN_CIPHERTEXT");
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(process.env.GOOGLE_TOKEN_ENCRYPTION_KEY!, "hex"), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

type TokenResponse = { access_token?: string; refresh_token?: string; error?: string };
async function tokenRequest(body: URLSearchParams): Promise<TokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body, cache: "no-store",
  });
  const data: TokenResponse = await response.json();
  if (!response.ok || !data.access_token) throw new Error(`GOOGLE_TOKEN_${data.error ?? response.status}`);
  return data;
}

export async function exchangeCode(code: string) {
  return tokenRequest(new URLSearchParams({
    client_id: process.env.GOOGLE_BUSINESS_CLIENT_ID!, client_secret: process.env.GOOGLE_BUSINESS_CLIENT_SECRET!,
    code, grant_type: "authorization_code", redirect_uri: googleRedirectUri(),
  }));
}

export async function refreshAccessToken(encryptedRefreshToken: string) {
  const result = await tokenRequest(new URLSearchParams({
    client_id: process.env.GOOGLE_BUSINESS_CLIENT_ID!, client_secret: process.env.GOOGLE_BUSINESS_CLIENT_SECRET!,
    refresh_token: decryptToken(encryptedRefreshToken), grant_type: "refresh_token",
  }));
  return result.access_token!;
}

async function googleGet<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!response.ok) throw new Error(`GOOGLE_API_${response.status}`);
  return response.json() as Promise<T>;
}

type Account = { name: string };
type Location = { name: string; title?: string; metadata?: { placeId?: string } };

export async function findAuthorizedLocation(accessToken: string, placeId: string) {
  let accountPage: string | undefined;
  do {
    const accountsUrl = new URL("https://mybusinessaccountmanagement.googleapis.com/v1/accounts");
    accountsUrl.searchParams.set("pageSize", "100");
    if (accountPage) accountsUrl.searchParams.set("pageToken", accountPage);
    const accounts = await googleGet<{ accounts?: Account[]; nextPageToken?: string }>(accountsUrl.toString(), accessToken);
    for (const account of accounts.accounts ?? []) {
      if (!/^accounts\/[^/]+$/.test(account.name)) continue;
      let locationPage: string | undefined;
      do {
        const locationsUrl = new URL(`https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations`);
        locationsUrl.searchParams.set("readMask", "name,title,metadata");
        locationsUrl.searchParams.set("pageSize", "100");
        if (locationPage) locationsUrl.searchParams.set("pageToken", locationPage);
        const locations = await googleGet<{ locations?: Location[]; nextPageToken?: string }>(locationsUrl.toString(), accessToken);
        const match = (locations.locations ?? []).find((location) => location.metadata?.placeId === placeId);
        if (match && /^locations\/[^/]+$/.test(match.name)) {
          return { accountName: account.name, locationName: `${account.name}/${match.name}` };
        }
        locationPage = locations.nextPageToken;
      } while (locationPage);
    }
    accountPage = accounts.nextPageToken;
  } while (accountPage);
  return null;
}

export async function getOwnReviewTotals(accessToken: string, locationName: string) {
  if (!/^accounts\/[^/]+\/locations\/[^/]+$/.test(locationName)) throw new Error("INVALID_LOCATION_NAME");
  const url = new URL(`https://mybusiness.googleapis.com/v4/${locationName}/reviews`);
  url.searchParams.set("pageSize", "1");
  const result = await googleGet<{ averageRating?: number; totalReviewCount?: number }>(url.toString(), accessToken);
  const rating = result.averageRating ?? (result.totalReviewCount === 0 ? 0 : NaN);
  if (!Number.isFinite(rating) || rating < 0 || rating > 5 ||
      !Number.isSafeInteger(result.totalReviewCount) || result.totalReviewCount! < 0) {
    throw new Error("INVALID_GOOGLE_REVIEW_TOTALS");
  }
  return { rating, reviewCount: result.totalReviewCount! };
}
