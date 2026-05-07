"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function RoutePrefetcher() {
  const router = useRouter();

  useEffect(() => {
    // Prefetch critical routes immediately
    const criticalRoutes = [
      "/dashboard",
      "/dashboard/messages",
      "/dashboard/communities",
      "/dashboard/settings",
    ];

    criticalRoutes.forEach((route) => {
      router.prefetch(route);
    });

    // Prefetch secondary routes after a short delay
    const timer = setTimeout(() => {
      const secondaryRoutes = [
        "/dashboard/attendance",
        "/dashboard/calendar",
        "/dashboard/support",
        "/dashboard/tickets",
      ];

      secondaryRoutes.forEach((route) => {
        router.prefetch(route);
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [router]);

  return null;
}