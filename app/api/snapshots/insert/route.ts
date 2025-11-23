import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getPlaceDetails } from "@/lib/googlePlaces";

export async function POST(req: NextRequest) {
    try {
        const { place_id, profile_id } = await req.json();

        if (!place_id || !profile_id) {
            return NextResponse.json(
                { error: "place_id and profile_id required" },
                { status: 400 }
            );
        }

        // 1) Obtener datos actualizados
        const google = await getPlaceDetails(place_id);

        if (!google) {
            return NextResponse.json(
                { error: "Failed to fetch place details" },
                { status: 500 }
            );
        }

        // 2) Buscar último snapshot DEL MISMO PERFIL
        const { data: last } = await supabaseAdmin
            .from("review_snapshots")
            .select("*")
            .eq("place_id", place_id)
            .eq("profile_id", profile_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        // 3) Insertar snapshot nuevo
        const { data: inserted, error } = await supabaseAdmin
            .from("review_snapshots")
            .insert({
                place_id,
                profile_id,   // 🔥 AHORA SÍ
                rating: google.rating,
                review_count: google.review_count,
                data: google,
            })
            .select()
            .single();

        if (error) {
            console.error("Insert snapshot error:", error);
            return NextResponse.json({ error }, { status: 500 });
        }

        // 4) Detectar alertas
        const alerts: any[] = [];

        if (last) {
            const oldCount = last.review_count ?? 0;
            const newCount = google.review_count ?? 0;

            if (newCount > oldCount) {
                alerts.push({
                    type: "review_increase",
                    message: `+${newCount - oldCount} nuevas reseñas`,
                });
            }

            if (google.rating !== last.rating) {
                alerts.push({
                    type: "rating_change",
                    message: `Nueva valoración: ${google.rating}`,
                });
            }
        }

        return NextResponse.json({
            ok: true,
            snapshot: inserted,
            alerts,
        });

    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
