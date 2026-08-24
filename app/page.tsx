import { PaperSurface } from "@/components/paper/PaperSurface";
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
    <PaperSurface className="grain relative min-h-screen overflow-x-hidden">
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
    </PaperSurface>
  );
}
