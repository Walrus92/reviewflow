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
    const values = editableProfile(body);
    if (typeof body.business_name === "string" && body.business_name.trim()) {
        values.slug = slugify(body.business_name);
    }
    const { data, error } = await supabaseAdmin
        .from("profiles")
        .update(values)
        .eq("email", email)
        .select()
        .single();

    if (error) return NextResponse.json({ error }, { status: 400 });

    return NextResponse.json(data);
}
