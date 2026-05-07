"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { GraduationCap } from "lucide-react";

const LoginPage = () => {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      const role = (user?.publicMetadata.role as string)?.toLowerCase();
      if (role) {
        // Sync admin to Prisma DB before redirecting (fixes admin count showing 0)
        if (role === "admin") {
          fetch("/api/sync-admin", { method: "POST" })
            .then(() => router.push(`/${role}`))
            .catch(() => router.push(`/${role}`));
        } else {
          router.push(`/${role}`);
        }
      }
    }
  }, [isLoaded, isSignedIn, user, router]);

  if (!isLoaded) return null;

  if (isSignedIn && user?.publicMetadata.role) return null;

  if (isSignedIn && !user?.publicMetadata.role) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-black text-white p-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Access restricted</h2>
            <p className="text-white/40 text-sm">
              Your account exists, but no role has been assigned yet.
              Please contact your administrator.
            </p>
          </div>
          <div className="space-y-4">
            <button
              onClick={() => window.location.href = '/'}
              className="w-full h-11 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-all"
            >
              Retry Login
            </button>
          </div>
          <div className="pt-4">
            <a href="/api/auth/logout" className="text-sm text-white hover:underline">Sign out</a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-black text-white">
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 flex-col justify-between p-12 relative overflow-hidden">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Glow blob */}

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">

            <span className="text-xl font-bold tracking-tight">gecX</span>
          </div>
        </div>

        {/* Tagline */}


        {/* Footer */}
        <div className="relative z-10 text-white/30 text-xs">
          © {new Date().getFullYear()} gecX. All rights reserved.
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6 md:p-12 lg:p-16">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="md:hidden flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-black" />
            </div>
            <span className="text-xl font-bold tracking-tight">gecX</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-white/40 text-sm mt-1">Sign in to your account to continue</p>
          </div>

          <SignIn.Root>
            <SignIn.Step name="start" className="space-y-4">
              <Clerk.GlobalError className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2 border border-red-400/20" />

              <Clerk.Field name="identifier" className="space-y-1.5">
                <Clerk.Label className="text-xs font-medium text-white/50 uppercase tracking-widest">
                  Username
                </Clerk.Label>
                <Clerk.Input
                  type="text"
                  required
                  className="w-full h-11 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all"
                  placeholder="Enter your username"
                />
                <Clerk.FieldError className="text-xs text-red-400" />
              </Clerk.Field>

              <Clerk.Field name="password" className="space-y-1.5">
                <Clerk.Label className="text-xs font-medium text-white/50 uppercase tracking-widest">
                  Password
                </Clerk.Label>
                <Clerk.Input
                  type="password"
                  required
                  className="w-full h-11 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all"
                  placeholder="Enter your password"
                />
                <Clerk.FieldError className="text-xs text-red-400" />
              </Clerk.Field>

              <SignIn.Action
                submit
                className="w-full h-11 mt-2 rounded-lg bg-white hover:bg-white/90 active:bg-white/80 text-black text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black"
              >
                Sign In
              </SignIn.Action>
            </SignIn.Step>
          </SignIn.Root>

          <div className="pt-8 border-t border-white/5 space-y-4">
            <div className="flex flex-col gap-1 text-center">
              <p className="text-[13px] text-white/40">Need help or a new account?</p>
              <a
                href="/tickets"
                className="text-[13px] font-semibold text-white hover:text-white/70 transition-colors flex items-center justify-center gap-1.5 group"
              >
                Raise a Support Ticket
                <svg
                  className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
