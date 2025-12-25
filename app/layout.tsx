import type { Metadata } from "next";
import { Outfit } from "next/font/google"; // Using Outfit for that modern tech look
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Lumina AI - Student Command Center",
  description: "Turn raw lecture audio into a high-fidelity knowledge base.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${outfit.variable} antialiased bg-background text-foreground min-h-screen font-sans selection:bg-primary/20 selection:text-primary`}
      >
        {children}
      </body>
    </html>
  );
}
