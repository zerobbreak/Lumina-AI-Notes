import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { HeroVisual } from "@/components/home/HeroVisual";
import { SmarterStudyTools } from "@/components/home/SmarterStudyTools";
import { StatsSection } from "@/components/home/StatsSection";
import { Testimonials } from "@/components/home/Testimonials";
import { PricingSection } from "@/components/home/PricingSection";
import { CTASection } from "@/components/home/CTASection";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { FadeIn } from "@/components/animations/FadeIn";
import { ComparisonBento } from "@/components/home/ComparisonBento";

export default function Home() {
  return (
    <main className="dark min-h-screen bg-[#020817] selection:bg-cyan-500/30 overflow-x-hidden">
      <Navbar />

      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-700/20 rounded-full blur-[140px] opacity-40 animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/20 rounded-full blur-[140px] opacity-30 animate-pulse-slow delay-1000"></div>
        <div className="absolute top-[30%] left-[40%] w-[30%] h-[30%] bg-blue-600/10 rounded-full blur-[100px] opacity-30 animate-blob"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 pt-32 pb-24">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-8 items-center mb-20">
          {/* Left Column: Copy */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-8 animate-fade-in-up">
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold text-cyan-400 mb-4 backdrop-blur-md shadow-lg shadow-cyan-500/20 transition-transform hover:scale-105 cursor-default">
                <span className="flex h-2 w-2 rounded-full bg-cyan-500 mr-2 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
                Now powered by Gemini-2.5 Flash
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.05] drop-shadow-2xl">
                Master Your Degree with{" "}
                <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 via-blue-500 to-purple-500 animate-gradient-x bg-size-[200%_auto]">
                  AI-Powered Notes
                </span>
              </h1>
              <p className="text-lg md:text-xl text-gray-300 max-w-xl mx-auto lg:mx-0 leading-relaxed font-light">
                The ultimate workspace for students. Organize courses, summarize
                lectures, and ace exams without the burnout.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center lg:justify-start">
              <Link href="/sign-up">
                <Button
                  size="lg"
                  className="h-14 px-8 bg-cyan-400 hover:bg-cyan-500 text-black font-bold text-base rounded-full min-w-[180px] shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] transition-all duration-300 hover:-translate-y-1"
                >
                  Sign Up Free
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 border-white/10 bg-white/5 hover:bg-white/10 text-white font-medium text-base rounded-full min-w-[180px] gap-2 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1"
              >
                <Play className="h-4 w-4 fill-current" /> Watch Demo
              </Button>
            </div>

            <div className="flex items-center gap-4 pt-6">
              <div className="flex -space-x-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-12 w-12 rounded-full border-2 border-[#020817] bg-gray-600 overflow-hidden ring-2 ring-black/20"
                  >
                    {/* Avatar placeholders */}
                    <div
                      className={`h-full w-full bg-linear-to-br from-indigo-400 to-cyan-400 opacity-${i * 20 + 60}`}
                    />
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <div className="flex gap-0.5 text-orange-400 mb-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg
                      key={i}
                      className="w-4 h-4 fill-current drop-shadow-sm"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-400 leading-none font-medium">
                  Trusted by{" "}
                  <span className="text-white font-bold">10,000+</span> students
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Visual */}
          <div className="w-full relative hidden lg:block scale-110 lg:translate-x-10">
            <HeroVisual />
          </div>
        </div>
      </div>

      <FadeIn>
        <ComparisonBento />
      </FadeIn>

      <StatsSection />

      <SmarterStudyTools />

      <FadeIn>
        <Testimonials />
      </FadeIn>

      <div id="pricing">
        <FadeIn>
          <PricingSection />
        </FadeIn>
      </div>

      <FadeIn>
        <CTASection />
      </FadeIn>

      <Footer />
    </main>
  );
}
