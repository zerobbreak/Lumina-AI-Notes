import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/components/providers/AppProvider";
import { MobileWarning } from "@/components/MobileWarning";
import { AppearanceProvider } from "@/components/providers/AppearanceProvider";
import { AppearanceToaster } from "@/components/providers/AppearanceToaster";
import { fontVariables } from "@/lib/appearance/fonts";
import { appearanceScript } from "@/lib/appearance/script";

/**
 * Where the site is served, so share previews get absolute URLs. Railway
 * provides RAILWAY_PUBLIC_DOMAIN at build time; NEXT_PUBLIC_SITE_URL wins
 * once there's a custom domain.
 */
function siteUrl(): URL {
  if (process.env.NEXT_PUBLIC_SITE_URL) return new URL(process.env.NEXT_PUBLIC_SITE_URL);
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return new URL(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
  return new URL("http://localhost:3000");
}

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: "Lumina AI - Student Command Center",
  description:
    "Turn raw lecture audio into a high-fidelity knowledge base. Organize courses, summarize lectures, and ace exams with AI-powered notes.",
  keywords: [
    "AI Note Taking",
    "Lecture Summarizer",
    "Student Productivity",
    "Study Tools",
    "College App",
    "Voice to Notes",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "Lumina AI - Master Your Degree",
    description:
      "The ultimate AI workspace for students. Turn lectures into summaries, flashcards, and quizzes instantly.",
    siteName: "Lumina Notes AI",
    // No image yet: public/og-image.jpg never existed, so previews linked a 404.
    // Add app/opengraph-image.(png|tsx) and Next picks it up for both cards.
  },
  twitter: {
    card: "summary_large_image",
    title: "Lumina AI - Student Command Center",
    description:
      "Stop drowning in notes. Let AI organize and summarize your lectures for you.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The pre-paint script sets the look's attributes on <html>.
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: appearanceScript() }} />
      </head>
      <body
        className="antialiased bg-background text-foreground min-h-screen font-sans selection:bg-primary/20 selection:text-primary"
        suppressHydrationWarning
      >
        <AppProvider>
          <AppearanceProvider>
            {children}
            <MobileWarning />
            <AppearanceToaster />
          </AppearanceProvider>
        </AppProvider>
      </body>
    </html>
  );
}
