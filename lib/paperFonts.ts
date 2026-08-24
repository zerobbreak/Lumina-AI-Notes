import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";

/**
 * Type system for the marketing site only. The app shell (dashboard, editor)
 * keeps its own --font-display / --font-body pair from globals.css.
 */
export const editorial = Fraunces({
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  variable: "--font-editorial",
});

export const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
  variable: "--font-plex",
});

export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});
