import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getGoogleDetails } from "@/lib/googlePlaces";

// Insertar snapshot para el negocio del usuario
export async function POST(req: NextRequest) {
    try {
        const { place_id } = await req.json();

        if (!place_id) {
            return NextResponse.json(
                { error: "place_id required" },
                { status: 400 }
            );
        }

        // 1) Obtener datos actualizados del negocio
        const google = await getGoogleDetails(place_id);

        if (!google) {
            return NextResponse.json(
                { error: "Failed to fetch place details" },
                { status: 500 }
            );
        }

        // 2) Buscar último snapshot
        const { data: last } = await supabaseAdmin
            .from("review_snapshots")
            .select("*")
            .eq("place_id", place_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        // 3) Insertar snapshot nuevo
        const { data: inserted, error } = await supabaseAdmin
            .from("review_snapshots")
            .insert({
                place_id,
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

        // 4) Detectar cambios para alertas
        const alerts = [];

        if (last) {
            if ((google.review_count ?? 0) > (last.review_count ?? 0)) {
                alerts.push({
                    type: "review_increase",
                    message: `+${google.review_count ?? 0 - last.review_count} nuevas reseñas`,
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
            success: true,
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
