import { NextRequest } from "next/server";
import { getUnreadCounts } from "@/actions/notification.actions";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return new Response("Missing userId", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial data
      try {
        const counts = await getUnreadCounts(userId);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(counts)}\n\n`)
        );
      } catch (error) {
        console.error("Error fetching initial unread counts:", error);
      }

      // Set up interval to send updates (less frequent than polling)
      const interval = setInterval(async () => {
        try {
          const counts = await getUnreadCounts(userId);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(counts)}\n\n`)
          );
        } catch (error) {
          console.error("Error fetching unread counts:", error);
        }
      }, 30000); // 30 seconds instead of 60

      // Cleanup on client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}