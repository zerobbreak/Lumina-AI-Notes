"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  ChevronLeft,
  Sparkles,
  GraduationCap,
  FolderOpen,
  Mic2,
  type LucideIcon,
} from "lucide-react";

import { StepMajor } from "@/components/onboarding/StepMajor";
import { StepCourses } from "@/components/onboarding/StepCourses";
import { StepPermissions } from "@/components/onboarding/StepPermissions";
import { InitializationScreen } from "@/components/onboarding/InitializationScreen";
import {
  OnboardingBackdrop,
  OnboardingProgress,
} from "@/components/onboarding/OnboardingChrome";
import {
  getEnabledBlocksForMajor,
  getMajorTheme,
  getStyleRecommendation,
} from "@/lib/noteStyleRecommendations";

const STEP_HINTS: Record<
  number,
  { title: string; body: string; icon: LucideIcon }
> = {
  1: {
    title: "Built for how you study",
    body: "A calm, focused workspace for notes, courses, and AI help—without the clutter.",
    icon: Sparkles,
  },
  2: {
    title: "We adapt to your field",
    body: "Your major shapes themes, shortcuts, and how the assistant reasons about your material.",
    icon: GraduationCap,
  },
  3: {
    title: "Ground your courses",
    body: "Syllabus PDFs give Lumina context—dates, terms, and structure—for smarter answers.",
    icon: FolderOpen,
  },
  4: {
    title: "Capture lectures in the moment",
    body: "Microphone access unlocks voice capture and transcription when you’re ready to record.",
    icon: Mic2,
  },
};

function formatMajorLabel(id: string) {
  if (!id) return "Your major";
  if (id === "cs") return "Computer Science";
  return id.charAt(0).toUpperCase() + id.slice(1);
}

export default function OnboardingPage() {
  const router = useRouter();
  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const uploadFile = useMutation(api.files.uploadFile);
  const userData = useQuery(api.users.getUser);

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    major: "",
    files: [] as File[],
    permissionsGranted: false,
  });

  const [isInitializing, setIsInitializing] = useState(false);

  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();

  useEffect(() => {
    if (userData && userData.onboardingComplete) {
      router.replace("/dashboard");
    }
  }, [userData, router]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/sign-in");
    }
  }, [authLoading, isAuthenticated, router]);

  const totalSteps = 4;

  const handleNext = async () => {
    if (step === totalSteps) {
      await handleFinish();
    } else {
      setStep(step + 1);
    }
  };

  const handleFinish = async () => {
    setIsInitializing(true);

    setTimeout(async () => {
      try {
        const coursePromises = formData.files.map(async (file) => {
          const postUrl = await generateUploadUrl();

          const result = await fetch(postUrl, {
            method: "POST",
            headers: { "Content-Type": file.type || "application/pdf" },
            body: file,
          });

          if (!result.ok) throw new Error(`Failed to upload ${file.name}`);
          const { storageId } = await result.json();

          const courseId = Math.random().toString(36).substring(7);

          await uploadFile({
            name: file.name,
            type: "pdf",
            storageId,
            courseId,
          });

          return {
            id: courseId,
            name: file.name.replace(".pdf", "").replace(".PDF", ""),
            code: "REQ-001",
          };
        });

        const courses = await Promise.all(coursePromises);
        const defaultTemplate = getStyleRecommendation(formData.major).primary;
        const coursesWithDefaults = courses.map((c) => ({
          ...c,
          defaultNoteStyle: defaultTemplate,
        }));

        const blocks = getEnabledBlocksForMajor(formData.major);
        const theme = getMajorTheme(formData.major);

        await completeOnboarding({
          major: formData.major,
          semester: "Fall 2025",
          courses: coursesWithDefaults,
          noteStyle: defaultTemplate,
          theme: theme.accent,
          enabledBlocks: blocks,
        });

        router.push("/dashboard?tour=1");
      } catch (error) {
        console.error("Onboarding failed", error);
        setIsInitializing(false);
      }
    }, 5500);
  };

  const hint = STEP_HINTS[step] ?? STEP_HINTS[1];
  const HintIcon = hint.icon;

  if (isInitializing) {
    return <InitializationScreen />;
  }

  if (authLoading || userData === undefined) {
    return (
      <div className="relative min-h-screen flex items-center justify-center text-zinc-400">
        <OnboardingBackdrop />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-indigo-500/30 border-t-indigo-400 animate-spin" />
          <p className="text-sm tracking-wide">Loading workspace…</p>
        </div>
      </div>
    );
  }

  if (userData && userData.onboardingComplete) {
    return (
      <div className="relative min-h-screen flex items-center justify-center text-zinc-400">
        <OnboardingBackdrop />
        <div className="relative z-10 flex items-center gap-2 text-sm">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          Redirecting…
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-zinc-100 flex flex-col">
      <OnboardingBackdrop />

      <header className="relative z-10 shrink-0 px-6 pt-8 pb-2 md:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
              <Sparkles className="h-4 w-4 text-white" strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight text-white">
                Lumina
              </p>
              <p className="text-[11px] text-zinc-500 uppercase tracking-[0.2em]">
                Setup
              </p>
            </div>
          </div>
          <p className="hidden sm:block text-xs text-zinc-500">
            ~2 minutes · You can add more later
          </p>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center px-4 pb-10 pt-4 md:px-8">
        <OnboardingProgress step={step} total={totalSteps} />

        <motion.div
          layout
          className="w-full max-w-6xl grid lg:grid-cols-12 gap-8 lg:gap-10 items-stretch"
        >
          {/* Form column */}
          <div className="lg:col-span-5 flex flex-col min-h-0">
            <div
              className="flex flex-col flex-1 rounded-[1.75rem] border border-white/[0.08] bg-zinc-900/40 backdrop-blur-xl shadow-[0_24px_80px_-20px_rgba(0,0,0,0.65)] ring-1 ring-white/[0.04] overflow-hidden"
            >
              <div className="px-6 pt-6 md:px-8 md:pt-8 pb-2 border-b border-white/[0.06]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22 }}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-300/90 mb-1">
                      {step === 1 && "Welcome"}
                      {step === 2 && "Your focus"}
                      {step === 3 && "Materials"}
                      {step === 4 && "Permissions"}
                    </p>
                    <h1 className="text-xl md:text-2xl font-semibold text-white tracking-tight">
                      {step === 1 && "Start your workspace"}
                      {step === 2 && "What do you study?"}
                      {step === 3 && "Add syllabus PDFs"}
                      {step === 4 && "Enable microphone"}
                    </h1>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex-1 flex flex-col min-h-[min(420px,55vh)] md:min-h-[460px] px-6 py-6 md:px-8 md:py-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="flex-1 flex flex-col"
                  >
                    {step === 1 && (
                      <div className="flex flex-col items-center justify-center text-center flex-1 gap-8 py-4">
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.05, type: "spring", damping: 18 }}
                          className="relative"
                        >
                          <div className="absolute inset-0 rounded-3xl bg-indigo-500/20 blur-2xl scale-150" />
                          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-500/30 ring-1 ring-white/20">
                            <Sparkles
                              className="h-9 w-9 text-white"
                              strokeWidth={1.5}
                            />
                          </div>
                        </motion.div>
                        <div className="space-y-3 max-w-sm">
                          <p className="text-zinc-300 text-[15px] leading-relaxed">
                            Notes, courses, and AI assistance in one place—so
                            you spend less time switching tools and more time
                            learning.
                          </p>
                        </div>
                      </div>
                    )}
                    {step === 2 && (
                      <StepMajor
                        value={formData.major}
                        onChange={(val) =>
                          setFormData({ ...formData, major: val })
                        }
                      />
                    )}
                    {step === 3 && (
                      <StepCourses
                        value={formData.files}
                        onChange={(val) =>
                          setFormData({ ...formData, files: val })
                        }
                      />
                    )}
                    {step === 4 && (
                      <StepPermissions
                        onPermissionGranted={() =>
                          setFormData({ ...formData, permissionsGranted: true })
                        }
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="mt-auto flex items-center justify-between gap-3 px-6 py-5 md:px-8 border-t border-white/[0.06] bg-black/20">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep(Math.max(1, step - 1))}
                  disabled={step === 1}
                  className="text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-xl px-4"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>

                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={
                    (step === 2 && !formData.major) ||
                    (step === 4 && !formData.permissionsGranted)
                  }
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-7 shadow-lg shadow-indigo-500/25 border border-white/10"
                >
                  {step === totalSteps ? "Finish & open Lumina" : "Continue"}
                  {step !== totalSteps && (
                    <ChevronRight className="ml-1 h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Preview column */}
          <div className="hidden lg:flex lg:col-span-7 flex-col min-h-[560px]">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex flex-1 flex-col rounded-[1.75rem] border border-white/[0.08] bg-zinc-950/50 backdrop-blur-md overflow-hidden shadow-[0_32px_100px_-24px_rgba(0,0,0,0.75)] ring-1 ring-inset ring-white/[0.04]"
            >
              <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06] bg-black/30">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-red-500/35 ring-1 ring-red-500/40" />
                  <span className="h-3 w-3 rounded-full bg-amber-500/35 ring-1 ring-amber-500/40" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500/35 ring-1 ring-emerald-500/40" />
                </div>
                <span className="ml-3 text-[11px] text-zinc-500 font-medium tracking-wide">
                  Preview
                </span>
              </div>

              <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.28 }}
                    className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-transparent p-6 flex gap-4"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 ring-1 ring-indigo-400/25">
                      <HintIcon className="h-5 w-5 text-indigo-300" />
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      <h3 className="text-base font-semibold text-white leading-snug">
                        {hint.title}
                      </h3>
                      <p className="text-sm text-zinc-400 leading-relaxed">
                        {hint.body}
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>

                <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-6 flex flex-col gap-5 flex-1 min-h-0">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-semibold text-white tracking-tight">
                        {formatMajorLabel(formData.major)}
                      </h3>
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1 text-xs text-zinc-300 ring-1 ring-white/[0.08]">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                        Fall 2025
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-500 uppercase tracking-wider">
                        This week
                      </p>
                      <p className="text-2xl font-semibold tabular-nums text-white">
                        {formData.files.length > 0
                          ? `${formData.files.length} PDF${formData.files.length > 1 ? "s" : ""}`
                          : "—"}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {step >= 3 ? "Syllabus files" : "Course files"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-zinc-500">
                      <span>Workspace readiness</span>
                      <span className="tabular-nums text-zinc-400">
                        {Math.round((step / totalSteps) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-400"
                        initial={false}
                        animate={{ width: `${(step / totalSteps) * 100}%` }}
                        transition={{
                          type: "spring",
                          stiffness: 100,
                          damping: 20,
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 flex-1 min-h-[140px]">
                    <div className="rounded-xl border border-white/[0.06] bg-black/25 p-4 flex flex-col justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-orange-500/15 flex items-center justify-center text-lg">
                          📝
                        </div>
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="h-2 w-16 bg-white/15 rounded-full" />
                          <div className="h-1.5 w-10 bg-white/10 rounded-full" />
                        </div>
                      </div>
                      <div className="space-y-1.5 mt-4">
                        <div className="h-1.5 w-full bg-white/[0.08] rounded-full" />
                        <div className="h-1.5 w-[88%] bg-white/[0.06] rounded-full" />
                        <div className="h-1.5 w-[72%] bg-white/[0.06] rounded-full" />
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-black/25 p-4 flex flex-col">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs text-zinc-500">Activity</span>
                        <span className="text-[11px] font-medium text-emerald-400/90">
                          +12%
                        </span>
                      </div>
                      <div className="flex flex-1 items-end gap-1.5 min-h-[72px]">
                        {[40, 70, 45, 90, 60, 80, 50].map((h, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-t-sm bg-indigo-500/15 relative overflow-hidden"
                          >
                            <motion.div
                              className="absolute bottom-0 left-0 right-0 rounded-t-sm bg-gradient-to-t from-indigo-600 to-violet-500"
                              initial={{ height: 0 }}
                              animate={{ height: `${h}%` }}
                              transition={{
                                delay: i * 0.04,
                                duration: 0.5,
                                ease: "easeOut",
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
