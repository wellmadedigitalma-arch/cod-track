import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(req) {
    const { connection_id } = await req.json();

    if (!connection_id) {
        return NextResponse.json({ error: "Missing connection_id" }, { status: 400 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SECRET_KEY
    );

    const { data: conn, error: fetchError } = await supabase
        .from("integration_connections")
        .select("credentials")
        .eq("id", connection_id)
        .maybeSingle();

    if (fetchError || !conn?.credentials?.refresh_token) {
        return NextResponse.json({ error: "No refresh token found" }, { status: 400 });
    }

    let tokenData;
    try {
        const tokenRes = await fetch("https://api.youcan.shop/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                client_id: process.env.YOUCAN_CLIENT_ID,
                client_secret: process.env.YOUCAN_CLIENT_SECRET,
                refresh_token: conn.credentials.refresh_token,
            }),
        });
        tokenData = await tokenRes.json();
    } catch (err) {
        console.error("YouCan refresh network error:", err);
        return NextResponse.json({ error: "Network error during refresh" }, { status: 500 });
    }

    if (!tokenData.access_token) {
        console.error("YouCan refresh failed:", tokenData);
        return NextResponse.json({ error: "Refresh failed", details: tokenData }, { status: 500 });
    }

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
    const { error: updateError } = await supabase
        .from("integration_connections")
        .update({
            credentials: {
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token || conn.credentials.refresh_token,
                expires_at: expiresAt,
            },
        })
        .eq("id", connection_id);

    if (updateError) {
        return NextResponse.json({ error: "Failed to save refreshed token" }, { status: 500 });
    }

    return NextResponse.json({ success: true, expires_at: expiresAt });
}
