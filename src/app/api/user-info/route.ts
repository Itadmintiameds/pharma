import { NextRequest, NextResponse } from "next/server";
import { decodeJwtPayload, readTokenPermissions } from "@/utils/jwt";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("access_token")?.value || request.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = decodeJwtPayload(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token structure" }, { status: 400 });
    }

    const userId = payload.userID || payload.userId || payload.sub;
    const email = payload.email || payload.sub || "";
    const role = payload.role || "";
    // The token carries the user's grants, so callers outside the dashboard
    // tree can gate on them without an extra round trip.
    const permissions = readTokenPermissions(payload);

    if (!userId) {
      return NextResponse.json({ error: "UserID claim not found in token" }, { status: 400 });
    }

    // TODO: accessToken is only still returned because the Setup Business flow
    // passes it to the admin backend as a Bearer header
    // (AddBusiness.tsx, SetupPharmacy.tsx). Drop it once those calls
    // authenticate with the cookie like the rest of the app.
    return NextResponse.json({ userId, email, role, permissions, accessToken: token });
  } catch {
    return NextResponse.json({ error: "Invalid token structure" }, { status: 400 });
  }
}
