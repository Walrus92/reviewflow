import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";

export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
        .from("magic_links")
        .select("*")
        .eq("token", token)
        .single();

    if (error || !data) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    const email = data.email;

    // 1) Crea un JWT igual al que NextAuth usa internamente
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

    const jwt = await new SignJWT({
        sub: email,         // Identificador del usuario
        email: email        // Información
    })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(secret);


    // 2) Crear cookie igual a la que usa Auth.js
    const response = NextResponse.redirect(new URL("/dashboard", req.url));
    response.cookies.set("next-auth.session-token", jwt, {
        httpOnly: true,
        secure: false, // en prod = true
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 días
    });

    return response;
}
