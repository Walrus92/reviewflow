import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import jwt from "jsonwebtoken";
import { getEmailFromCookie } from "@/lib/auth";

function slugify(str: string) {
    return str
        .toLowerCase()
        .replace(/'/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export async function GET(req: NextRequest) {
    const email = getEmailFromCookie(req);
    if (!email) return NextResponse.json(null, { status: 401 });

    const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email)
        .single();

    return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
    const email = getEmailFromCookie(req);

    if (!email) return NextResponse.json(null, { status: 401 });

    const body = await req.json();
    const slug = slugify(body.business_name);

    const { data, error } = await supabase
        .from("profiles")
        .insert([{ email, slug, ...body }])
        .select()
        .single();

    if (error) return NextResponse.json({ error }, { status: 400 });

    return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
    const email = getEmailFromCookie(req);
    if (!email) return NextResponse.json(null, { status: 401 });

    const body = await req.json();
    if (body.business_name) {
        body.slug = slugify(body.business_name);
    }
    const { data, error } = await supabase
        .from("profiles")
        .update(body)
        .eq("email", email)
        .select()
        .single();

    if (error) return NextResponse.json({ error }, { status: 400 });

    return NextResponse.json(data);
}
