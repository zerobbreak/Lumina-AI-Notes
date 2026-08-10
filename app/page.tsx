import nextDynamic from "next/dynamic";
import { Navbar } from "@/components/layout/Navbar";
import { HoloHero } from "@/components/home/HoloHero";
import { FeatureFlow } from "@/components/home/FeatureFlow";
import { Manifesto } from "@/components/home/Manifesto";
import { Footer } from "@/components/layout/Footer";
import { FadeIn } from "@/components/animations/FadeIn";

// Below-the-fold sections: split into their own chunks so their JS isn't
// parsed/executed as part of the initial hero render. `ssr: true` (the
// default) keeps them in the static HTML for SEO.
const WIPRoadmap = nextDynamic(() =>
  import("@/components/home/WIPRoadmap").then((m) => m.WIPRoadmap),
);
const PrivateVault = nextDynamic(() =>
  import("@/components/home/PrivateVault").then((m) => m.PrivateVault),
);

export const dynamic = "force-static";

export default function Home() {
  return (
    <main className="dark min-h-screen text-white selection:bg-amber-500/30 overflow-x-hidden selection:text-white font-body" style={{ background: 'var(--obs-bg)', fontFamily: "var(--font-body, 'DM Sans', sans-serif)" }}>
      <Navbar />

      {/* Persistent Background Depth - restrained, single soft light source rather than dual blob glow */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Core lighting */}
        <div className="absolute top-[-15%] left-[-5%] w-[55%] h-[55%] rounded-full blur-[180px] opacity-[0.08] animate-pulse-slow mix-blend-screen" style={{ background: 'var(--obs-amber)', willChange: 'transform, opacity' }} />
        <div className="absolute bottom-[-15%] right-[-5%] w-[45%] h-[45%] rounded-full blur-[170px] opacity-[0.06] animate-pulse-slow mix-blend-screen" style={{ animationDelay: '2s', background: 'var(--obs-teal)', willChange: 'transform, opacity' }} />

        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.07]"
             style={{
               backgroundImage: `linear-gradient(to right, rgba(229,226,218,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(229,226,218,0.1) 1px, transparent 1px)`,
               backgroundSize: '4rem 4rem',
               maskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, #000 40%, transparent 100%)',
               WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, #000 40%, transparent 100%)'
             }}
        />

        {/* Grain overlay */}
        <div className="noise-overlay absolute inset-0 opacity-[0.035] mix-blend-overlay" style={{ transform: 'translateZ(0)' }} />
      </div>

      <div className="relative z-10">
        <HoloHero />
        
        <FadeIn delay={0.1}>
          <FeatureFlow />
        </FadeIn>

        <Manifesto />

        <FadeIn delay={0.2}>
          <WIPRoadmap />
        </FadeIn>

        <PrivateVault />

        <Footer />
      </div>
    </main>
  );
}
