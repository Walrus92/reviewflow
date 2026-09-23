import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ownsProfileId, requireProfile } from "@/lib/requestAuth";

const API_BASE = process.env.NEXT_PUBLIC_SITE_URL;

export async function POST(req: NextRequest) {
    try {
        const auth = await requireProfile(req);
        if (auth.error) return auth.error;

        const { lat, lng, type, profile_id } = await req.json();

        if (!lat || !lng || !type || !profile_id) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }
        if (!ownsProfileId(auth.profile, profile_id)) {
            return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
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

        const saved: { competitor_id: number; place_id: string }[] = [];

        for (const c of competitors) {
            if (c.place_id === auth.profile.place_id) continue;
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
            } catch {
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
