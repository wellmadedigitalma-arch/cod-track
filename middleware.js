import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function middleware(req) {
    let res = NextResponse.next({
        request: {
            headers: req.headers,
        },
    });
    const { pathname } = req.nextUrl;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // ────────────────────────────────────────────────────────
    // PUBLIC ROUTES - No authentication required
    // ────────────────────────────────────────────────────────
    const publicRoutes = [
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/accept-invite",
        "/api",
    ];

    const isPublicRoute =
        pathname === "/" ||
        publicRoutes.some(route => pathname === route || pathname.startsWith(route + "/"));

    if (isPublicRoute) {
        return res;
    }

    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn("Supabase environment variables missing in middleware.");
        return res;
    }

    try {
        const supabase = createServerClient(
            supabaseUrl,
            supabaseAnonKey,
            {
                cookies: {
                    get(name) {
                        return req.cookies.get(name)?.value;
                    },
                    set(name, value, options) {
                        req.cookies.set({ name, value, ...options });
                        res = NextResponse.next({
                            request: {
                                headers: req.headers,
                            },
                        });
                        res.cookies.set({ name, value, ...options });
                    },
                    remove(name, options) {
                        req.cookies.set({ name, value: "", ...options });
                        res = NextResponse.next({
                            request: {
                                headers: req.headers,
                            },
                        });
                        res.cookies.set({ name, value: "", ...options });
                    },
                },
            }
        );

        // Get user session securely
        const {
            data: { user },
        } = await supabase.auth.getUser();

        // ────────────────────────────────────────────────────────
        // AUTHENTICATION CHECK
        // ────────────────────────────────────────────────────────
        if (!user) {
            const loginUrl = new URL("/login", req.url);
            loginUrl.searchParams.set("redirect", pathname);
            return NextResponse.redirect(loginUrl);
        }

        // ────────────────────────────────────────────────────────
        // ADMIN ROUTES PROTECTION
        // ────────────────────────────────────────────────────────
        if (pathname.startsWith("/admin")) {
            try {
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
            } catch (err) {
                console.error("Middleware admin check error:", err);
                return NextResponse.redirect(new URL("/dashboard", req.url));
            }
        }
    } catch (e) {
        console.error("Middleware error:", e);
    }

    return res;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};