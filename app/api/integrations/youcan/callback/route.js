import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    const reqUrl = new URL(req.url);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || reqUrl.origin;
    const redirectUri = process.env.YOUCAN_REDIRECT_URI || `${reqUrl.origin}/api/integrations/youcan/callback`;

    if (error || !code) {
        return NextResponse.redirect(`${siteUrl}/integrations?error=youcan_denied`);
    }

    // Decode state to get tenantId
    let tenantId;
    try {
        const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
        tenantId = decoded.tenantId;
    } catch {
        return NextResponse.redirect(`${siteUrl}/integrations?error=invalid_state`);
    }

    if (!tenantId) {
        return NextResponse.redirect(`${siteUrl}/integrations?error=invalid_state`);
    }

    // Exchange authorization code for access + refresh token
    let tokenData;
    try {
        const tokenRes = await fetch("https://api.youcan.shop/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                client_id: process.env.YOUCAN_CLIENT_ID,
                client_secret: process.env.YOUCAN_CLIENT_SECRET,
                redirect_uri: redirectUri,
                code,
            }),
        });
        tokenData = await tokenRes.json();
    } catch (err) {
        console.error("YouCan token exchange network error:", err);
        return NextResponse.redirect(`${siteUrl}/integrations?error=youcan_token_failed`);
    }

    if (!tokenData.access_token) {
        console.error("YouCan token error:", tokenData);
        return NextResponse.redirect(`${siteUrl}/integrations?error=youcan_token_failed`);
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SECRET_KEY
    );

    // Look up the integration row for YouCan
    const { data: integration } = await supabase
        .from("integrations")
        .select("id")
        .eq("slug", "youcan")
        .maybeSingle();

    // Store / update the connection with OAuth tokens
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
    const { error: upsertError } = await supabase
        .from("integration_connections")
        .upsert(
            {
                tenant_id: tenantId,
                integration_id: integration?.id,
                status: "active",
                credentials: {
                    access_token: tokenData.access_token,
                    refresh_token: tokenData.refresh_token,
                    expires_at: expiresAt,
                },
                config: { type: "oauth_youcan" },
            },
            { onConflict: "tenant_id,integration_id" }
        );

    if (upsertError) {
        console.error("YouCan upsert error:", upsertError);
        return NextResponse.redirect(`${siteUrl}/integrations?error=youcan_save_failed`);
    }

    return NextResponse.redirect(`${siteUrl}/integrations?success=youcan_connected`);
}
