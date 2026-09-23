import { NextResponse, NextRequest } from "next/server";

import { jwtVerify } from "jose";

export async function proxy(req: NextRequest) {
    const protectedPaths = [
        "/dashboard",
        "/competitors",
        "/history",
        "/alerts",
        "/settings",
        "/landing"
    ];

    const { pathname } = req.nextUrl;
    const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

    if (!isProtected) {
        return NextResponse.next();
    }

    const token = req.cookies.get("reviewflow.session")?.value;

    if (!token) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
        const { payload } = await jwtVerify(
            token,
            new TextEncoder().encode(process.env.NEXTAUTH_SECRET)
        );
        if (typeof payload.email !== "string") throw new Error("Missing email");
        return NextResponse.next();
    } catch {
        return NextResponse.redirect(new URL("/login", req.url));
    }
}

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/competitors/:path*",
        "/history/:path*",
        "/alerts/:path*",
        "/settings/:path*",
        "/landing/:path*",
    ],
};
