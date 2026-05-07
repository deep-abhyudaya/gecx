import { currentUser } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";

const menuItems = [
  {
    title: "MENU",
    items: [
      {
        icon: "/home.png",
        label: "Home",
        href: "/",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/teacher.png",
        label: "Teachers",
        href: "/list/teachers",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/student.png",
        label: "Students",
        href: "/list/students",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/parent.png",
        label: "Parents",
        href: "/list/parents",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/class.png", // reusing generic block
        label: "Grades",
        href: "/list/grades",
        visible: ["admin"],
      },
      {
        icon: "/subject.png",
        label: "Subjects",
        href: "/list/subjects",
        visible: ["admin"],
      },
      {
        icon: "/class.png",
        label: "Classes",
        href: "/list/classes",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/lesson.png",
        label: "Lessons",
        href: "/list/lessons",
        visible: ["admin", "teacher"],
      },
      // ... Courses Group ...
      {
        icon: "/assignment.png", // fallback icon
        label: "Course Builder",
        href: "/teacher/courses/builder",
        visible: ["teacher"],
      },
      {
        icon: "/assignment.png",
        label: "Course Approvals",
        href: "/list/courses/approvals",
        visible: ["admin"],
      },
      {
        icon: "/assignment.png",
        label: "My Courses",
        href: "/student/courses/my",
        visible: ["student"],
      },
      {
        icon: "/assignment.png",
        label: "Course Catalog",
        href: "/student/courses",
        visible: ["student"],
      },
      {
        icon: "/exam.png",
        label: "Exams",
        href: "/list/exams",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/assignment.png",
        label: "Assignments",
        href: "/list/assignments",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/result.png",
        label: "Results",
        href: "/list/results",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/attendance.png",
        label: "Attendance",
        href: "/list/attendance",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/calendar.png",
        label: "Events",
        href: "/list/events",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/message.png",
        label: "Messages",
        href: "/list/messages",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/message.png",
        label: "Support Tickets",
        href: "/support",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/announcement.png",
        label: "Announcements",
        href: "/list/announcements",
        visible: ["admin", "teacher", "student", "parent"],
      },
    ],
  },
  {
    title: "OTHER",
    items: [
      {
        icon: "/profile.png",
        label: "Profile",
        href: "/profile",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/setting.png",
        label: "Settings",
        href: "/settings",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/announcement.png",
        label: "Notifications",
        href: "/notifications",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/message.png",
        label: "Requests",
        href: "/requests",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/logout.png",
        label: "Logout",
        href: "/logout",
        visible: ["admin", "teacher", "student", "parent"],
      },
    ],
  },
];

import LogoutButton from "./LogoutButton";
import { getUnreadCounts } from "@/actions/notification.actions";

const Menu = async () => {
  const user = await currentUser();
  const role = user?.publicMetadata.role as string;
  const counts = await getUnreadCounts();

  return (
    <div className="mt-4 text-sm">
      {menuItems.map((i) => (
        <div className="flex flex-col gap-2" key={i.title}>
          <span className="hidden lg:block text-muted-foreground font-light my-4">
            {i.title}
          </span>
          {i.items.map((item) => {
            if (item.visible.includes(role)) {
              if (item.label === "Logout") {
                return <LogoutButton key={item.label} icon={item.icon} label={item.label} />;
              }

              const count =
                item.label === "Messages"
                  ? counts.messages
                  : item.label === "Support Tickets"
                    ? counts.tickets
                    : item.label === "Requests"
                      ? counts.requests
                      : item.label === "Teachers"
                        ? counts.teachers
                        : item.label === "Students"
                          ? counts.students
                          : item.label === "Parents"
                            ? counts.parents
                            : item.label === "Course Builder" || item.label === "Course Approvals" || item.label === "Available Courses"
                              ? counts.courses
                              : item.label === "Exams"
                                ? counts.exams
                                : item.label === "Assignments"
                                  ? counts.assignments
                                  : item.label === "Results"
                                    ? counts.results
                                    : item.label === "Enrollments"
                                      ? counts.enrollments
                                      : item.label === "Notifications"
                                        ? counts.notifications
                                        : 0;

              return (
                <Link
                  href={item.href}
                  key={item.label}
                  className="flex items-center justify-center lg:justify-start gap-4 text-muted-foreground py-2 md:px-2 rounded-md hover:bg-card relative group"
                >
                  <Image src={item.icon} alt="" width={20} height={20} />
                  <span className="hidden lg:block">{item.label}</span>
                  {count > 0 && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm animate-in zoom-in duration-300">
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </Link>
              );
            }
          })}
        </div>
      ))}
    </div>
  );
};

export default Menu;
