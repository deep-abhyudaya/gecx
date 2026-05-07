"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  Search,
  Users,
  Users2,
  BookMarked,
  NotebookPen,
  FlaskConical,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  group: string;
  keywords?: string;
  visible: string[];
};

const NAV_ITEMS: NavItem[] = [
  // Dashboards
  {
    label: "Admin Dashboard",
    href: "/admin",
    icon: <LayoutDashboard className="h-4 w-4" />,
    group: "Dashboards",
    keywords: "overview home",
    visible: ["admin"],
  },
  {
    label: "Teacher Dashboard",
    href: "/teacher",
    icon: <LayoutDashboard className="h-4 w-4" />,
    group: "Dashboards",
    visible: ["teacher"],
  },
  {
    label: "Student Dashboard",
    href: "/student",
    icon: <LayoutDashboard className="h-4 w-4" />,
    group: "Dashboards",
    visible: ["student"],
  },
  {
    label: "Parent Dashboard",
    href: "/parent",
    icon: <LayoutDashboard className="h-4 w-4" />,
    group: "Dashboards",
    visible: ["parent"],
  },
  // Lists
  {
    label: "Teachers",
    href: "/list/teachers",
    icon: <GraduationCap className="h-4 w-4" />,
    group: "Management",
    keywords: "staff faculty",
    visible: ["admin", "teacher"],
  },
  {
    label: "Students",
    href: "/list/students",
    icon: <Users className="h-4 w-4" />,
    group: "Management",
    keywords: "pupils learners",
    visible: ["admin", "teacher"],
  },
  {
    label: "Parents",
    href: "/list/parents",
    icon: <Users2 className="h-4 w-4" />,
    group: "Management",
    visible: ["admin", "teacher"],
  },
  {
    label: "Classes",
    href: "/list/classes",
    icon: <BookOpen className="h-4 w-4" />,
    group: "Management",
    keywords: "rooms sections",
    visible: ["admin", "teacher"],
  },
  {
    label: "Subjects",
    href: "/list/subjects",
    icon: <BookMarked className="h-4 w-4" />,
    group: "Management",
    keywords: "courses curriculum",
    visible: ["admin"],
  },
  // Academic
  {
    label: "Lessons",
    href: "/list/lessons",
    icon: <NotebookPen className="h-4 w-4" />,
    group: "Academic",
    keywords: "schedule period",
    visible: ["admin", "teacher"],
  },
  {
    label: "Exams",
    href: "/list/exams",
    icon: <FlaskConical className="h-4 w-4" />,
    group: "Academic",
    keywords: "test assessment",
    visible: ["admin", "teacher", "student", "parent"],
  },
  {
    label: "Assignments",
    href: "/list/assignments",
    icon: <ClipboardList className="h-4 w-4" />,
    group: "Academic",
    keywords: "homework tasks",
    visible: ["admin", "teacher", "student", "parent"],
  },
  {
    label: "Results",
    href: "/list/results",
    icon: <ClipboardList className="h-4 w-4" />,
    group: "Academic",
    keywords: "grades marks scores",
    visible: ["admin", "teacher", "student", "parent"],
  },
  {
    label: "Attendance",
    href: "/list/attendance",
    icon: <CalendarCheck className="h-4 w-4" />,
    group: "Academic",
    keywords: "present absent",
    visible: ["admin", "teacher"],
  },
  // Other
  {
    label: "Events",
    href: "/list/events",
    icon: <CalendarDays className="h-4 w-4" />,
    group: "School",
    keywords: "activities calendar",
    visible: ["admin", "teacher", "student", "parent"],
  },
  {
    label: "Announcements",
    href: "/list/announcements",
    icon: <Megaphone className="h-4 w-4" />,
    group: "School",
    keywords: "news notices",
    visible: ["admin", "teacher", "student", "parent"],
  },
];

// Group the items
const GROUPS = Array.from(new Set(NAV_ITEMS.map((i) => i.group)));

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { user } = useUser();
  const userRole = (user?.publicMetadata.role as string) || "";

  // Filter nav items based on user role
  const filteredNavItems = NAV_ITEMS.filter((item) => item.visible.includes(userRole));
  const filteredGroups = Array.from(new Set(filteredNavItems.map((i) => i.group)));

  // ⌘K / Ctrl+K shortcut
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback(
    (command: () => unknown) => {
      setOpen(false);
      command();
    },
    []
  );

  return (
    <>
      {/* Trigger button in navbar */}
      <button
        id="global-search-trigger"
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 text-xs rounded-full px-3 py-2 bg-muted hover:bg-muted/80 transition-all duration-200 text-muted-foreground hover:text-foreground group border border-border"
        aria-label="Open global search"
      >
        <Search className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
        <span className="w-[140px] text-left">Search anything…</span>
        <kbd className="ml-auto hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-60">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Mobile icon-only trigger */}
      <button
        onClick={() => setOpen(true)}
        className="flex md:hidden items-center justify-center h-8 w-8 rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Open search"
      >
        <Search className="h-4 w-4" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search pages, teachers, students…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {filteredGroups.map((group, i) => (
            <React.Fragment key={group}>
              {i > 0 && <CommandSeparator />}
              <CommandGroup heading={group}>
                {filteredNavItems.filter((item) => item.group === group).map((item) => (
                  <CommandItem
                    key={item.href}
                    value={`${item.label} ${item.keywords ?? ""}`}
                    onSelect={() =>
                      runCommand(() => router.push(item.href))
                    }
                    className="cursor-pointer"
                  >
                    <span className="mr-2 text-muted-foreground">
                      {item.icon}
                    </span>
                    {item.label}
                    <span className="ml-auto text-xs text-muted-foreground/60">
                      {item.href}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </React.Fragment>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
