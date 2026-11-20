import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function middleware(req) {
    const res = NextResponse.next();
    const { pathname } = req.nextUrl;

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                get(name) {
                    return req.cookies.get(name)?.value;
                },
                set(name, value, options) {
                    res.cookies.set({ name, value, ...options });
                },
                remove(name, options) {
                    res.cookies.set({ name, value: "", ...options });
                },
            },
        }
    );

    // Get session
    const {
        data: { session },
    } = await supabase.auth.getSession();

    // ────────────────────────────────────────────────────────
    // PUBLIC ROUTES - No authentication required
    // ────────────────────────────────────────────────────────
    const publicRoutes = [
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/accept-invite",
        "/api/public",
    ];

    const isPublicRoute = publicRoutes.some(route =>
        pathname === route || pathname.startsWith(route + "/") || pathname.startsWith("/_next") || pathname.startsWith("/api/")
    );

    if (isPublicRoute) {
        return res;
    }

    // ────────────────────────────────────────────────────────
    // AUTHENTICATION CHECK
    // ────────────────────────────────────────────────────────
    if (!session) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // ────────────────────────────────────────────────────────
    // ADMIN ROUTES PROTECTION
    // ────────────────────────────────────────────────────────
    if (pathname.startsWith("/admin")) {
        try {
            const user = session.user;
            const adminCheckUrl = new URL("/api/admin/check", req.url);

            const checkRes = await fetch(adminCheckUrl, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": user.id,
                    "x-admin-key": process.env.ADMIN_SECRET_KEY || "super_secret_123",
                },
            });

            if (!checkRes.ok) {
                return NextResponse.redirect(new URL("/dashboard", req.url));
            }

            const checkData = await checkRes.json();

            if (!checkData.isAdmin) {
                return NextResponse.redirect(new URL("/dashboard", req.url));
            }

            console.log(`Admin access granted: ${user.email} → ${pathname}`);

        } catch (err) {
            console.error("Middleware admin check error:", err);
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }
    }

    return res;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};