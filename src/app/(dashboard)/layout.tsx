import Navbar from "@/components/Navbar";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardLayoutClient } from "@/components/DashboardLayoutClient";

import { cookies } from "next/headers";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = cookies();
  const layout = cookieStore.get("react-resizable-panels:layout");
  let defaultLayout = undefined;
  if (layout) {
    try {
      defaultLayout = JSON.parse(layout.value);
    } catch (e) {}
  }

  return (
    <DashboardLayoutClient
      sidebar={<AppSidebar />}
      topBar={<Navbar />}
      defaultLayout={defaultLayout}
    >
      {children}
    </DashboardLayoutClient>
  );
}
