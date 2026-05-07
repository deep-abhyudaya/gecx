import { NextResponse } from "next/server";
import { getUnreadCounts } from "@/actions/notification.actions";

/**
 * GET /api/notifications/counts
 * Returns the current user's unread notification counts as JSON.
 * Used by SidebarInner for client-side polling to keep badges up-to-date.
 * No caching — always fetches fresh from DB.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const counts = await getUnreadCounts();
    return NextResponse.json(counts);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch notification counts" },
      { status: 500 }
    );
  }
}
