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
    <main className="dark min-h-screen text-white selection:bg-amber-500/30 overflow-x-hidden selection:text-white font-body" style={{ background: '#02050a', fontFamily: "var(--font-body, 'DM Sans', sans-serif)" }}>
      <Navbar />

      {/* Persistent Background Depth - Ambient Intelligence */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Core lighting */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[160px] opacity-[0.15] animate-pulse-slow mix-blend-screen" style={{ background: 'var(--obs-amber)', willChange: 'transform, opacity' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] opacity-[0.12] animate-pulse-slow mix-blend-screen" style={{ animationDelay: '2s', background: 'var(--obs-teal)', willChange: 'transform, opacity' }} />
        
        {/* Grid/Neural paths */}
        <div className="absolute inset-0 opacity-[0.12]" 
             style={{ 
               backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)`,
               backgroundSize: '4rem 4rem',
               maskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, #000 40%, transparent 100%)',
               WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, #000 40%, transparent 100%)'
             }} 
        />
        
        {/* Grain overlay */}
        <div className="noise-overlay absolute inset-0 opacity-[0.04] mix-blend-overlay" style={{ transform: 'translateZ(0)' }} />
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
