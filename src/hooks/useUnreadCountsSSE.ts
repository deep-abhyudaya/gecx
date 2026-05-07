"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

interface UnreadCounts {
  messages: number;
  notifications: number;
  tickets: number;
  total: number;
}

export function useUnreadCountsSSE() {
  const { user } = useUser();
  const [counts, setCounts] = useState<UnreadCounts>({
    messages: 0,
    notifications: 0,
    tickets: 0,
    total: 0,
  });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const eventSource = new EventSource(
      `/api/sse/unread-counts?userId=${user.id}`
    );

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setCounts(data);
      } catch (error) {
        console.error("Error parsing SSE data:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [user?.id]);

  return { counts, isConnected };
}