import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getEmailFromCookie } from "@/lib/auth";

function slugify(str: string) {
    return str
        .toLowerCase()
        .replace(/'/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

const editableFields = [
    "business_name", "google_review_url", "instagram_url", "wifi_ssid",
    "wifi_password", "custom_cta", "types", "place_id", "address",
    "rating", "reviews", "lat", "lng", "weekly_email_enabled",
] as const;

function editableProfile(body: Record<string, unknown>) {
    return Object.fromEntries(
        editableFields.filter((field) => field in body).map((field) => [field, body[field]])
    );
}

function normalizedBusinessName(value: string | null) {
    return value?.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("es") ?? "";
}

function businessIdentityChanged(
    current: { place_id: string | null; business_name: string | null },
    next: { place_id: string | null; business_name: string | null }
) {
    const currentPlaceId = current.place_id?.trim() || null;
    const nextPlaceId = next.place_id?.trim() || null;
    if (currentPlaceId !== nextPlaceId) return true;
    return !currentPlaceId && normalizedBusinessName(current.business_name) !== normalizedBusinessName(next.business_name);
}

async function hasBusinessHistory(profileId: string) {
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

export async function GET(req: NextRequest) {
    const email = getEmailFromCookie(req);
    if (!email) return NextResponse.json(null, { status: 401 });

    const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("email", email)
        .single();

    if (error && error.code !== "PGRST116") {
        return NextResponse.json({ error: "PROFILE_LOOKUP_FAILED" }, { status: 500 });
    }
    return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
    const email = getEmailFromCookie(req);

    if (!email) return NextResponse.json(null, { status: 401 });

    const body = await req.json();
    if ("weekly_email_enabled" in body && typeof body.weekly_email_enabled !== "boolean") {
        return NextResponse.json({ error: "INVALID_EMAIL_PREFERENCE" }, { status: 400 });
    }
    if (typeof body.business_name !== "string" || !body.business_name.trim()) {
        return NextResponse.json({ error: "BUSINESS_NAME_REQUIRED" }, { status: 400 });
    }
    const values = editableProfile(body);
    const slug = slugify(body.business_name);

    const { data, error } = await supabaseAdmin
        .from("profiles")
        .insert([{ ...values, email, slug }])
        .select()
        .single();

    if (error) return NextResponse.json({ error }, { status: 400 });

    return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
    const email = getEmailFromCookie(req);
    if (!email) return NextResponse.json(null, { status: 401 });

    const body = await req.json();
    if ("weekly_email_enabled" in body && typeof body.weekly_email_enabled !== "boolean") {
        return NextResponse.json({ error: "INVALID_EMAIL_PREFERENCE" }, { status: 400 });
    }
    if ("place_id" in body && body.place_id !== null && typeof body.place_id !== "string") {
        return NextResponse.json({ error: "INVALID_PLACE_ID" }, { status: 400 });
    }
    if ("business_name" in body &&
        (typeof body.business_name !== "string" || !body.business_name.trim())) {
        return NextResponse.json({ error: "BUSINESS_NAME_REQUIRED" }, { status: 400 });
    }
    const values = editableProfile(body);
    if (typeof body.business_name === "string" && body.business_name.trim()) {
        values.business_name = body.business_name.trim();
        values.slug = slugify(body.business_name);
    }
    if ("place_id" in body) values.place_id = typeof body.place_id === "string" ? body.place_id.trim() || null : null;

    const current = await supabaseAdmin.from("profiles")
        .select("id,place_id,business_name").eq("email", email).maybeSingle();
    if (current.error) return NextResponse.json({ error: "PROFILE_LOOKUP_FAILED" }, { status: 500 });
    if (!current.data) return NextResponse.json({ error: "PROFILE_NOT_FOUND" }, { status: 404 });

    const nextIdentity = {
        place_id: "place_id" in values ? values.place_id as string | null : current.data.place_id,
        business_name: "business_name" in values ? values.business_name as string : current.data.business_name,
    };
    if (businessIdentityChanged(current.data, nextIdentity)) {
        try {
            if (await hasBusinessHistory(current.data.id)) {
                return NextResponse.json({ error: "BUSINESS_IDENTITY_LOCKED" }, { status: 409 });
            }
        } catch {
            return NextResponse.json({ error: "PROFILE_HISTORY_LOOKUP_FAILED" }, { status: 500 });
        }
    }
    const { data, error } = await supabaseAdmin
        .from("profiles")
        .update(values)
        .eq("id", current.data.id)
        .select()
        .single();

    if (error) return NextResponse.json({ error }, { status: 400 });

    return NextResponse.json(data);
}
