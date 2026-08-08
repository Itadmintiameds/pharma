import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("access_token")?.value || request.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = Buffer.from(base64, "base64").toString("utf8");
    const payload = JSON.parse(jsonPayload);
    
    const userId = payload.userID || payload.userId || payload.sub;
    const email = payload.email || payload.sub || "";
    const role = payload.role || "";

    if (!userId) {
      return NextResponse.json({ error: "UserID claim not found in token" }, { status: 400 });
    }

    return NextResponse.json({ userId, email, role, accessToken: token });
  } catch (e) {
    return NextResponse.json({ error: "Invalid token structure" }, { status: 400 });
  }
}
