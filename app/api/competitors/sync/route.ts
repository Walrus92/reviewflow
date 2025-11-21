import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import jwt from "jsonwebtoken";

const API_BASE = process.env.NEXT_PUBLIC_SITE_URL;

function getEmailFromCookie(req: NextRequest) {
    const token = req.cookies.get("next-auth.session-token")?.value;
    if (!token) return null;

    try {
        const decoded: any = jwt.verify(token, process.env.NEXTAUTH_SECRET!);
        return decoded.email;
    } catch {
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        const email = getEmailFromCookie(req);
        if (!email) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

        const { lat, lng, type, profile_id } = await req.json();

        if (!lat || !lng || !type || !profile_id) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        // 1. Buscar competidores vía Nearby API
        const res = await fetch(`${API_BASE}/api/google/nearby`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat, lng, type }),
        });

        const competitors = await res.json();

        if (!Array.isArray(competitors)) {
            return NextResponse.json({ error: "Failed nearby" }, { status: 500 });
        }

        const saved: any[] = [];

        for (const c of competitors) {
            // 2. Insertar en "competitors" si no existe
            const { data: existing } = await supabase
                .from("competitors")
                .select("*")
                .eq("place_id", c.place_id)
                .single();

            let competitor_id = existing?.id;

            if (!competitor_id) {
                const { data: newComp, error } = await supabase
                    .from("competitors")
                    .insert({
                        place_id: c.place_id,
                        name: c.name,
                        types: c.types,
                        lat: c.lat,
                        lng: c.lng,
                    })
                    .select()
                    .single();

                if (error) continue;

                competitor_id = newComp.id;
            }

            // 3. Crear relación profile ↔ competitor si no existe
            try {
                await supabase
                    .from("competitor_relations")
                    .insert({
                        profile_id,
                        competitor_id,
                    })
                    .select()
                    .single();
            } catch (err) {
                // silencioso
            }


            saved.push({ competitor_id, place_id: c.place_id });
        }

        return NextResponse.json({ ok: true, count: saved.length, saved });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
    }
}
