import Link from "next/link";
import { Navbar } from "@/components/Navbar";
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

export default function Home() {
  return (
    <main className="min-h-screen bg-[#020817] selection:bg-cyan-500/30 overflow-x-hidden">
      <Navbar />

      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px] opacity-30"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-900/20 rounded-full blur-[100px] opacity-20"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center mb-20">
          {/* Left Column: Copy */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-400 mb-4 backdrop-blur-sm">
                <span className="flex h-2 w-2 rounded-full bg-cyan-500 mr-2 animate-pulse"></span>
                Now with GPT-4o
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]">
                Master Your Degree with{" "}
                <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-500">
                  AI-Powered Notes
                </span>
              </h1>
              <p className="text-lg text-gray-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                The ultimate workspace for students. Organize courses, summarize
                lectures, and ace exams without the burnout.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center lg:justify-start">
              <Link href="/sign-up">
                <Button
                  size="lg"
                  className="h-12 px-8 bg-cyan-400 hover:bg-cyan-500 text-black font-semibold rounded-full min-w-[160px]"
                >
                  Sign Up Free
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-full min-w-[160px] gap-2"
              >
                <Play className="h-4 w-4 fill-current" /> Watch Demo
              </Button>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <div className="flex -space-x-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-10 w-10 rounded-full border-2 border-[#020817] bg-gray-600 overflow-hidden"
                  >
                    {/* Avatar placeholders if available, otherwise just color */}
                    <div
                      className={`h-full w-full bg-linear-to-br from-indigo-400 to-purple-400 opacity-${i * 30 + 40}`}
                    />
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <div className="flex gap-0.5 text-orange-400 mb-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg
                      key={i}
                      className="w-4 h-4 fill-current"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-400 leading-none">
                  Trusted by{" "}
                  <span className="text-white font-semibold">10,000+</span>{" "}
                  students
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Visual */}
          <div className="w-full relative hidden lg:block">
            <HeroVisual />
          </div>
        </div>
      </div>

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
