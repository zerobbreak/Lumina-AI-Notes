import { Navbar } from "@/components/layout/Navbar";
import { HoloHero } from "@/components/home/HoloHero";
import { FeatureFlow } from "@/components/home/FeatureFlow";
import { WIPRoadmap } from "@/components/home/WIPRoadmap";
import { Manifesto } from "@/components/home/Manifesto";
import { LiveProcessing } from "@/components/home/LiveProcessing";
import { Synthesis } from "@/components/home/Synthesis";
import { PrivateVault } from "@/components/home/PrivateVault";
import { Footer } from "@/components/layout/Footer";
import { FadeIn } from "@/components/animations/FadeIn";

export const dynamic = "force-static";

export default function Home() {
  return (
    <main className="dark min-h-screen text-white selection:bg-amber-500/30 overflow-x-hidden selection:text-white font-body" style={{ background: 'var(--obs-bg, #050a14)', fontFamily: "var(--font-body, 'DM Sans', sans-serif)" }}>
      <Navbar />

      {/* Persistent Background Depth */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20 animate-pulse-slow will-change-transform" style={{ background: 'var(--obs-amber, #d4a853)' }} />
        <div className="absolute bottom-[5%] right-[-5%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-15 animate-pulse-slow will-change-transform" style={{ background: 'var(--obs-teal, #2dd4bf)' }} />
        <div className="noise-overlay absolute inset-0 opacity-[0.02] translate-z-0" />
      </div>

      <div className="relative z-10">
        <HoloHero />
        
        <FadeIn delay={0.1}>
          <FeatureFlow />
        </FadeIn>

        <LiveProcessing />

        <Manifesto />
        
        <FadeIn delay={0.2}>
          <Synthesis />
        </FadeIn>

        <FadeIn delay={0.2}>
          <WIPRoadmap />
        </FadeIn>

        <PrivateVault />

        <Footer />
      </div>
    </main>
  );
}
