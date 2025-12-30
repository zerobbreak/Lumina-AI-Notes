"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

import { StepMajor } from "@/components/onboarding/StepMajor";
import { StepCourses } from "@/components/onboarding/StepCourses";
import { StepNoteStyle } from "@/components/onboarding/StepNoteStyle";
import { StepPermissions } from "@/components/onboarding/StepPermissions";
import { InitializationScreen } from "@/components/onboarding/InitializationScreen";
import Image from "next/image";

export default function OnboardingPage() {
  const router = useRouter();
  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const userData = useQuery(api.users.getUser);

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    major: "",
    files: [] as File[],
    noteStyle: "",
    permissionsGranted: false,
  });

  const [isInitializing, setIsInitializing] = useState(false);

  // Redirect to dashboard if user has already completed onboarding
  useEffect(() => {
    if (userData && userData.onboardingComplete) {
      router.replace("/dashboard");
    }
  }, [userData, router]);

  const totalSteps = 5;

  const handleNext = async () => {
    if (step === totalSteps) {
      await handleFinish();
    } else {
      setStep(step + 1);
    }
  };

  const handleFinish = async () => {
    setIsInitializing(true);

    // Simulate "Artificial Delay" for the cool animation
    setTimeout(async () => {
      try {
        // In a real app, upload files here
        const fakeCourses = formData.files.map((f) => ({
          id: Math.random().toString(),
          name: f.name.replace(".pdf", ""),
          code: "REQ-001", // Placeholder
        }));

        // Determine blocks based on major (simple logic)
        const blocks = ["text", "quiz"];
        if (formData.major === "cs") blocks.push("code-sandbox");
        if (formData.major === "engineering" || formData.major === "math")
          blocks.push("graphing");

        await completeOnboarding({
          major: formData.major,
          semester: "Fall 2025",
          courses: fakeCourses,
          noteStyle: formData.noteStyle,
          enabledBlocks: blocks,
        });

        router.push("/dashboard");
      } catch (error) {
        console.error("Onboarding failed", error);
        setIsInitializing(false);
      }
    }, 5500); // 5.5s delay to let animations play out
  };

  if (isInitializing) {
    return <InitializationScreen />;
  }

  // Loading state while checking user data
  if (userData === undefined) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-gray-500">
        <div className="flex items-center gap-2 animate-pulse">
          <Sparkles className="w-5 h-5" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Waiting for redirect if already completed onboarding
  if (userData && userData.onboardingComplete) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-gray-500">
        <div className="flex items-center gap-2 animate-pulse">
          <Sparkles className="w-5 h-5" />
          <span>Redirecting to dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/30 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px]" />

      <motion.div layout className="w-full max-w-6xl relative z-10">
        {/* Progress Bar */}
        <div className="w-full max-w-md mx-auto h-1 bg-white/10 rounded-full mb-12 overflow-hidden">
          <motion.div
            className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
            initial={{ width: 0 }}
            animate={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        {/* Content Container */}
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* Left: Interactive Form */}
          <div className="lg:col-span-5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 min-h-[500px] flex flex-col justify-between shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-linear-to-br from-white/5 to-transparent pointer-events-none group-hover:from-white/10 transition-colors duration-500" />

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex-1"
              >
                {step === 1 && (
                  <div className="text-center h-full flex flex-col items-center justify-center space-y-6">
                    <div className="w-16 h-16 bg-linear-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg mb-4">
                      <span className="text-3xl">✨</span>
                    </div>
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-linear-to-r from-white to-gray-400">
                      Welcome to Lumina
                    </h1>
                    <p className="text-gray-400 text-lg">
                      Let's tailor your collaborative workspace to your unique
                      learning journey.
                    </p>
                  </div>
                )}
                {step === 2 && (
                  <StepMajor
                    value={formData.major}
                    onChange={(val) => setFormData({ ...formData, major: val })}
                    files={undefined}
                    setFiles={function (files: any): void {
                      throw new Error("Function not implemented.");
                    }}
                  />
                )}
                {step === 3 && (
                  <StepCourses
                    value={formData.files}
                    onChange={(val) => setFormData({ ...formData, files: val })}
                  />
                )}
                {step === 4 && (
                  <StepNoteStyle
                    value={formData.noteStyle}
                    onChange={(val) =>
                      setFormData({ ...formData, noteStyle: val })
                    }
                  />
                )}
                {step === 5 && (
                  <StepPermissions
                    onPermissionGranted={() =>
                      setFormData({ ...formData, permissionsGranted: true })
                    }
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-white/5 relative z-10">
              <Button
                variant="ghost"
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1}
                className="text-gray-400 hover:text-white hover:bg-white/5"
              >
                <ChevronLeft className="mr-2 w-4 h-4" /> Back
              </Button>

              <Button
                onClick={handleNext}
                disabled={
                  (step === 2 && !formData.major) ||
                  (step === 4 && !formData.noteStyle) ||
                  (step === 5 && !formData.permissionsGranted)
                }
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all hover:scale-105 active:scale-95"
              >
                {step === totalSteps ? "Finish Customization" : "Next"}
                {step !== totalSteps && (
                  <ChevronRight className="ml-2 w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Right: Dynamic Preview */}
          <div className="hidden lg:block lg:col-span-7 relative h-[600px] w-full perspective-[2000px]">
            {/* Glowing orb behind the card */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-indigo-500/20 rounded-full blur-[100px]" />

            {/* Glass Mockup */}
            <motion.div
              initial={{ opacity: 0, rotateY: -10, scale: 0.95 }}
              animate={{ opacity: 1, rotateY: 0, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative w-full h-full bg-[#0F0F12]/80 backdrop-blur-md rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl p-8 flex flex-col"
            >
              {/* Fake Window Controls */}
              <div className="flex gap-2 mb-6 absolute top-6 left-6">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
              </div>

              {/* Fake Header */}
              <div className="flex items-center justify-between mb-8 pl-16">
                <div className="flex items-center gap-4 text-white/20 text-sm font-medium">
                  <span className="hover:text-white/40 cursor-default transition-colors">
                    Dashboard
                  </span>
                  <span className="hover:text-white/40 cursor-default transition-colors">
                    Courses
                  </span>
                  <span className="hover:text-white/40 cursor-default transition-colors">
                    Calendar
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-64 h-9 bg-white/5 rounded-full border border-white/5 flex items-center px-4">
                    <div className="w-4 h-4 rounded-full bg-white/10 mr-2" />
                    <div className="h-2 w-24 bg-white/10 rounded-full" />
                  </div>
                  <div className="w-9 h-9 rounded-full bg-linear-to-tr from-indigo-500 to-purple-600 border border-white/20 shadow-lg" />
                </div>
              </div>

              {/* Dynamic Content Preview based on Step */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6 flex-1"
                >
                  <div className="h-48 w-full bg-linear-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20 rounded-3xl border border-white/5 p-8 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="flex justify-between items-start z-10">
                      <div>
                        <h3 className="text-3xl font-bold text-white mb-2">
                          {formData.major
                            ? `${formData.major.charAt(0).toUpperCase() + formData.major.slice(1)}`
                            : "Select Major..."}
                        </h3>
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-xs text-indigo-200 border border-white/5 backdrop-blur-sm">
                          Fall Semester 2025
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400 mb-1">
                          GPA Goal
                        </div>
                        <div className="text-2xl font-bold text-emerald-400">
                          4.0
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 z-10 w-2/3">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>15%</span>
                      </div>
                      <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 w-[15%]" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 h-40">
                    {/* Recent Note Card */}
                    <div className="bg-[#1A1A1E] rounded-3xl border border-white/5 p-5 flex flex-col relative overflow-hidden">
                      <div className="flex items-center gap-3 mb-auto">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
                          <span className="text-lg">📝</span>
                        </div>
                        <div>
                          <div className="h-3 w-20 bg-white/20 rounded mb-1.5" />
                          <div className="h-2 w-12 bg-white/10 rounded" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="h-1.5 w-full bg-white/10 rounded-full" />
                        <div className="h-1.5 w-[90%] bg-white/10 rounded-full" />
                        <div className="h-1.5 w-[75%] bg-white/10 rounded-full" />
                      </div>

                      {formData.noteStyle && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                          <span className="text-white font-medium bg-white/10 px-4 py-2 rounded-full border border-white/10">
                            {formData.noteStyle} Layout
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Stats Card */}
                    <div className="bg-[#1A1A1E] rounded-3xl border border-white/5 p-5 flex flex-col justify-between">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm text-gray-400">
                          Weekly Focus
                        </div>
                        <div className="text-xs text-green-400">+12%</div>
                      </div>

                      <div className="flex items-end justify-between gap-2 h-20">
                        {[40, 70, 45, 90, 60, 80, 50].map((h, i) => (
                          <div
                            key={i}
                            className="w-full bg-indigo-500/20 rounded-t-sm relative group"
                          >
                            <div
                              className="absolute bottom-0 left-0 right-0 bg-indigo-500 rounded-t-sm transition-all duration-500 group-hover:bg-indigo-400"
                              style={{ height: `${h}%` }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
