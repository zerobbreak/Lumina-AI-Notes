import { Navbar } from "@/components/Navbar";
import { HeroVisual } from "@/components/home/HeroVisual";
import { FeatureGrid } from "@/components/home/FeatureGrid";
import { HowItWorks } from "@/components/home/HowItWorks";
import { ComparisonBento } from "@/components/home/ComparisonBento";
import { TemplatesSection } from "@/components/home/TemplatesSection";
import { PricingSection } from "@/components/home/PricingSection";
import { CTASection } from "@/components/home/CTASection";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";
import { FadeIn } from "@/components/animations/FadeIn";

export default function Home() {
  return (
    <main className="min-h-screen bg-transparent selection:bg-purple-500/30">
      <Navbar />

      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full blur-[120px] opacity-40"></div>
        <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] bg-purple-500/20 rounded-full blur-[100px] opacity-30"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left Column: Copy */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]">
                Unlock Your{" "}
                <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-purple-400">
                  Genius
                </span>{" "}
                <br />
                with AI-Powered Lectures
              </h1>
              <p className="text-lg text-muted-foreground maxWidth-xl mx-auto lg:mx-0">
                Turn raw lecture audio into a high-fidelity, Notion-style
                knowledge base. Generate summaries, quizzes, and flashcards
                instantly.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center lg:justify-start">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-linear-to-r from-pink-600 to-purple-600 rounded-lg blur opacity-60 group-hover:opacity-100 transition duration-200"></div>
                <Button
                  size="lg"
                  className="relative h-12 px-8 bg-black text-white hover:bg-black/90 border border-white/10"
                >
                  <Mic className="mr-2 h-5 w-5 text-red-500 animate-pulse" />
                  Start Recording
                </Button>
              </div>
              <Button size="lg" variant="secondary" className="h-12 px-8">
                Start Free Today
              </Button>
            </div>

            <div className="text-sm text-muted-foreground flex items-center gap-4">
              <span>Last edited 2 minutes ago</span>
              <span className="h-1 w-1 bg-gray-500 rounded-full"></span>
              <span>Used by 10,000+ Students</span>
            </div>
          </div>

          {/* Right Column: Visual */}
          <div className="w-full relative">
            <HeroVisual />
          </div>
        </div>

        {/* Features Footer */}
        <FeatureGrid />
      </div>

      <div className="relative z-10 space-y-20">
        <FadeIn>
          <HowItWorks />
        </FadeIn>
        <FadeIn>
          <ComparisonBento />
        </FadeIn>
        <FadeIn>
          <TemplatesSection />
        </FadeIn>
        <FadeIn>
          <PricingSection />
        </FadeIn>
        <FadeIn>
          <CTASection />
        </FadeIn>
      </div>

      <Footer />
    </main>
  );
}
