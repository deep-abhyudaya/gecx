import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ThemeProvider } from "@/components/theme-provider";

import { GlobalNotificationProvider } from "@/components/GlobalNotification";
import { getEquippedColors } from "@/actions/color-shop.actions";
import { auth } from "@clerk/nextjs/server";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "gecX",
  description: "School Management System",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = auth();
  let htmlThemeStyle: React.CSSProperties = {};   // CSS vars — go on <html>
  let bodyBgImage: string | undefined;             // gradient backgroundImage — goes on <body>
  let themeMode: "light" | "dark" | undefined = undefined;

  if (userId) {
    try {
      const colors = await getEquippedColors(userId);
      if (colors?.themeVars) {
        const parsed = JSON.parse(colors.themeVars) as Record<string, string>;

        // Separate backgroundImage (gradient) from CSS custom properties
        const { backgroundImage, ...cssVars } = parsed;
        bodyBgImage = backgroundImage as string | undefined;
        htmlThemeStyle = cssVars as React.CSSProperties;

        // Determine light vs dark from background lightness
        const bg = cssVars["--background"];
        if (bg) {
          const match = bg.match(/(\d+(?:\.\d+)?)%/g);
          if (match && match.length >= 2) {
            const lightness = parseFloat(match[1]); // second % = lightness in HSL
            themeMode = lightness > 50 ? "light" : "dark";
          }
        }
      }
    } catch (e) {
      console.error("Failed to load user theme", e);
    }
  }

  return (
    <ClerkProvider>
      {/* Theme CSS vars live on <html> so they have higher specificity than html.dark class rules */}
      <html
        lang="en"
        suppressHydrationWarning
        style={{
          ...htmlThemeStyle,
          colorScheme: themeMode ?? "dark",
        }}
      >
        <body
          className={inter.className}
          style={bodyBgImage ? { backgroundImage: bodyBgImage } : undefined}
        >
          <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme={themeMode} disableTransitionOnChange>
            <GlobalNotificationProvider>
              {children}
            </GlobalNotificationProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
