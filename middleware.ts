import { NextResponse, NextRequest } from "next/server";

import { jwtVerify } from "jose";

export async function middleware(req: NextRequest) {
    const protectedPaths = [
        "/dashboard",
        "/alerts",
        "/settings",
        "/landing"
    ];

    const { pathname } = req.nextUrl;
    const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

    if (!isProtected) {
        return NextResponse.next();
    }

    const token = req.cookies.get("next-auth.session-token")?.value;

    if (!token) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
        await jwtVerify(
            token,
            new TextEncoder().encode(process.env.NEXTAUTH_SECRET)
        );
        return NextResponse.next();
    } catch (err) {
        return NextResponse.redirect(new URL("/login", req.url));
    }
}

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/alerts/:path*",
        "/settings/:path*",
        "/landing/:path*",
    ],
};
