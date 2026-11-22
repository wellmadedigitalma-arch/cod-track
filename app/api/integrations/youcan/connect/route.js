import { NextResponse } from "next/server";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenant_id");

    const reqUrl = new URL(req.url);
    const clientId = process.env.YOUCAN_CLIENT_ID;
    const redirectUri = process.env.YOUCAN_REDIRECT_URI || `${reqUrl.origin}/api/integrations/youcan/callback`;

    if (!clientId) {
        return NextResponse.json({ error: "Missing YouCan env variable YOUCAN_CLIENT_ID" }, { status: 500 });
    }
    if (!tenantId) {
        return NextResponse.json({ error: "Missing tenant_id" }, { status: 400 });
    }

    // Encode tenant_id in state param so the callback can retrieve it
    const state = Buffer.from(JSON.stringify({ tenantId })).toString("base64url");

    const url = new URL("https://seller-area.youcan.shop/admin/oauth/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);
    // YouCan requires scope as repeated array params: scope[]=...
    url.searchParams.append("scope[]", "read-orders");
    url.searchParams.append("scope[]", "read-products");

    return NextResponse.redirect(url.toString());
}
