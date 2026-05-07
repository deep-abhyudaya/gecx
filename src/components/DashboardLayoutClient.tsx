"use client";

import { useRef, useState } from "react";
import { ImperativePanelHandle } from "react-resizable-panels";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { SidebarContextProvider } from "./sidebar-context";
import { SidebarToggleButton } from "./sidebar-toggle-button";
import { CollapsibleTopBar } from "./CollapsibleTopBar";
import { RoutePrefetcher } from "./RoutePrefetcher";

export function DashboardLayoutClient({
  sidebar,
  topBar,
  children,
  defaultLayout,
}: {
  sidebar: React.ReactNode;
  topBar: React.ReactNode;
  children: React.ReactNode;
  defaultLayout?: number[];
}) {
  const panelRef = useRef<ImperativePanelHandle>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggle = () => {
    const panel = panelRef.current;
    if (panel) {
      if (panel.isCollapsed()) {
        panel.expand();
      } else {
        panel.collapse();
      }
    }
  };

  const onLayout = (sizes: number[]) => {
    if (typeof window !== "undefined" && window.innerWidth < 768) return;
    document.cookie = `react-resizable-panels:layout=${JSON.stringify(sizes)}; path=/; max-age=31536000`;
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <RoutePrefetcher />
      <ResizablePanelGroup
        direction="horizontal"
        className="h-full overflow-hidden"
        onLayout={onLayout}
      >
        <ResizablePanel
          ref={panelRef}
          collapsible={true}
          minSize={12}
          maxSize={25}
          defaultSize={defaultLayout?.[0] ?? 16}
          collapsedSize={0}
          onCollapse={() => setCollapsed(true)}
          onExpand={() => setCollapsed(false)}
          className="hidden md:flex flex-col transition-all duration-300 ease-in-out overflow-y-auto no-scrollbar"
        >
          <SidebarContextProvider value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen, toggle, panelRef }}>
            {sidebar}
          </SidebarContextProvider>
        </ResizablePanel>

        <ResizableHandle withHandle className="hidden md:flex" />

        <ResizablePanel defaultSize={defaultLayout?.[1] ?? 84}>
          <div className="h-full flex flex-col overflow-hidden">
            <CollapsibleTopBar>
              <div className="w-full flex items-center bg-background shrink-0">
                <SidebarToggleButton
                  collapsed={collapsed}
                  onToggle={toggle}
                  onMobileOpen={() => setMobileOpen(true)}
                />
                <div className="flex-1">{topBar}</div>
              </div>
            </CollapsibleTopBar>
            <div className="flex-1 overflow-hidden relative">
              <main className="h-full overflow-y-auto">{children}</main>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
