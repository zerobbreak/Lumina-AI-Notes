import "./landing.css";
import { editorial, plexSans, plexMono } from "./landing-fonts";
import { Masthead } from "@/components/home/landing/Masthead";
import { Hero } from "@/components/home/landing/Hero";
import { IndexStrip } from "@/components/home/landing/IndexStrip";
import { Method } from "@/components/home/landing/Method";
import { Apparatus } from "@/components/home/landing/Apparatus";
import { Recall } from "@/components/home/landing/Recall";
import { Roadmap } from "@/components/home/landing/Roadmap";
import { ClosingCTA } from "@/components/home/landing/ClosingCTA";
import { Colophon } from "@/components/home/landing/Colophon";

export const dynamic = "force-static";

export default function Home() {
  return (
    <div
      className={`lumina-landing grain relative min-h-screen overflow-x-hidden ${editorial.variable} ${plexSans.variable} ${plexMono.variable}`}
      style={{ ["--tw-ring-color" as string]: "var(--vermilion)" }}
    >
      <Masthead />

      <main>
        <Hero />
        <IndexStrip />
        <Method />
        <Apparatus />
        <Recall />
        <Roadmap />
        <ClosingCTA />
      </main>

      <Colophon />
    </div>
  );
}
