import type { Metadata } from "next";
import { Outfit } from "next/font/google"; // Using Outfit for that modern tech look
import "./globals.css";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import { Toaster } from "sonner";
import { MobileWarning } from "@/components/MobileWarning";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
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
    url: "https://luminanotes.ai", // Replace with actual URL when deployed
    title: "Lumina AI - Master Your Degree",
    description:
      "The ultimate AI workspace for students. Turn lectures into summaries, flashcards, and quizzes instantly.",
    siteName: "Lumina Notes AI",
    images: [
      {
        url: "/og-image.jpg", // Ensure you have an image at public/og-image.jpg or change this
        width: 1200,
        height: 630,
        alt: "Lumina AI Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lumina AI - Student Command Center",
    description:
      "Stop drowning in notes. Let AI organize and summarize your lectures for you.",
    images: ["/twitter-image.jpg"], // Ensure this exists or use og-image
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${outfit.variable} antialiased bg-background text-foreground min-h-screen font-sans selection:bg-primary/20 selection:text-primary`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <ConvexClientProvider>{children}</ConvexClientProvider>
          <MobileWarning />
          <Toaster theme="system" position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
