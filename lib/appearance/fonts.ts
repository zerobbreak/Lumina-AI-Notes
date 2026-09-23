import {
  Atkinson_Hyperlegible,
  Geist,
  IBM_Plex_Sans,
  Instrument_Sans,
  JetBrains_Mono,
  Lexend,
  Literata,
  Newsreader,
  Outfit,
} from "next/font/google";

/**
 * The app's selectable typefaces. next/font self-hosts them at build time;
 * each one only declares an @font-face, so the browser downloads a family
 * the first time something renders in it. Only the new-user UI default is
 * preloaded. globals.css maps [data-ui-font] / [data-reading-font] onto these
 * variables.
 */
const geist = Geist({ subsets: ["latin"], display: "swap", variable: "--font-geist" });
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
  preload: false,
});
const outfit = Outfit({ subsets: ["latin"], display: "swap", variable: "--font-outfit", preload: false });
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument-sans",
  preload: false,
});

const newsreader = Newsreader({
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  preload: false,
});
const literata = Literata({
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  variable: "--font-literata",
  preload: false,
});
const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-atkinson",
  preload: false,
});
const lexend = Lexend({ subsets: ["latin"], display: "swap", variable: "--font-lexend", preload: false });

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
  preload: false,
});

/** Class names that define every font variable; goes on <html>. */
export const fontVariables = [
  geist,
  plexSans,
  outfit,
  instrumentSans,
  newsreader,
  literata,
  atkinson,
  lexend,
  jetbrainsMono,
]
  .map((font) => font.variable)
  .join(" ");
