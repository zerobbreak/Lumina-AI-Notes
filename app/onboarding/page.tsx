"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAppAuth } from "@/lib/hooks/auth/useAppAuth";
import { useCompleteOnboarding } from "@/lib/hooks/users/useCompleteOnboarding";
import { useUserData } from "@/lib/hooks/users/useUserData";
import { useCreateFileAction } from "@/lib/hooks/files/useCreateFileAction";
import { useStorageUpload } from "@/lib/hooks/uploads/useStorageUpload";
import { usersApi } from "@/lib/api/domains/users.api";
import { useApiToken } from "@/lib/api/use-api-token";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  ChevronLeft,
  Sparkles,
  GraduationCap,
  FolderOpen,
  Mic2,
  Palette,
  type LucideIcon,
} from "lucide-react";

import { StepMajor } from "@/components/onboarding/StepMajor";
import { StepLook } from "@/components/onboarding/StepLook";
import { StepCourses } from "@/components/onboarding/StepCourses";
import { StepPermissions } from "@/components/onboarding/StepPermissions";
import { InitializationScreen } from "@/components/onboarding/InitializationScreen";
import {
  OnboardingBackdrop,
  OnboardingProgress,
} from "@/components/onboarding/OnboardingChrome";
import {
  getEnabledBlocksForMajor,
  getStyleRecommendation,
} from "@/lib/noteStyleRecommendations";

const STEP_HINTS: Record<
  number,
  { title: string; body: string; icon: LucideIcon }
> = {
  1: {
    title: "Built for how you study",
    body: "A calm, focused workspace for notes, modules, and AI help—without the clutter.",
    icon: Sparkles,
  },
  2: {
    title: "We adapt to your field",
    body: "Your major shapes note layouts, shortcuts, and how the assistant reasons about your material.",
    icon: GraduationCap,
  },
  3: {
    title: "Make it yours",
    body: "Pick the world you’ll study in. It changes right away, and you can switch any time from the sidebar.",
    icon: Palette,
  },
  4: {
    title: "Ground your modules",
    body: "Brightspace brings in your modules and due dates; syllabus PDFs give Lumina context for smarter answers.",
    icon: FolderOpen,
  },
  5: {
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
  const completeOnboarding = useCompleteOnboarding();
  const uploadToStorage = useStorageUpload();
  const uploadFile = useCreateFileAction();
  const userData = useUserData();
  const { getApiToken } = useApiToken();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    major: "",
    files: [] as File[],
    permissionsGranted: false,
  });

  const [isInitializing, setIsInitializing] = useState(false);

  const { isAuthenticated, isLoading: authLoading } = useAppAuth();

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

    setTimeout(async () => {
      try {
        const coursePromises = formData.files.map(async (file) => {
          const storageId = await uploadToStorage(file);
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

        const fromPdfs = await Promise.all(coursePromises);
        // Onboarding replaces the course list, so keep the ones Brightspace
        // already set up (read fresh: a sync may have added some just now).
        const existing = (await usersApi.getMe(await getApiToken())).courses ?? [];
        const courses = [
          ...existing.map(({ id, name, code }) => ({ id, name, code })),
          ...fromPdfs,
        ];
        const defaultTemplate = getStyleRecommendation(formData.major).primary;
        const coursesWithDefaults = courses.map((c) => ({
          ...c,
          defaultNoteStyle: defaultTemplate,
        }));

        const blocks = getEnabledBlocksForMajor(formData.major);

        await completeOnboarding({
          major: formData.major,
          semester: "Fall 2025",
          courses: coursesWithDefaults,
          noteStyle: defaultTemplate,
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
      <div className="relative min-h-screen flex items-center justify-center text-muted-foreground">
        <OnboardingBackdrop />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-indigo-400 animate-spin" />
          <p className="text-sm tracking-wide">Loading workspace…</p>
        </div>
      </div>
    );
  }

  if (userData && userData.onboardingComplete) {
    return (
      <div className="relative min-h-screen flex items-center justify-center text-muted-foreground">
        <OnboardingBackdrop />
        <div className="relative z-10 flex items-center gap-2 text-sm">
          <Sparkles className="w-4 h-4 text-primary" />
          Redirecting…
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-foreground flex flex-col">
      <OnboardingBackdrop />

      <header className="relative z-10 shrink-0 px-6 pt-8 pb-2 md:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary-alt shadow-lg shadow-primary/25">
              <Sparkles className="h-4 w-4 text-foreground" strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight text-foreground">
                Lumina
              </p>
              <p className="text-[11px] text-muted-foreground/80 uppercase tracking-[0.2em]">
                Setup
              </p>
            </div>
          </div>
          <p className="hidden sm:block text-xs text-muted-foreground/80">
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
              className="flex flex-col flex-1 rounded-[1.75rem] border border-foreground/8 bg-card/40 backdrop-blur-xl shadow-[0_24px_80px_-20px_rgba(0,0,0,0.65)] ring-1 ring-foreground/4 overflow-hidden"
            >
              <div className="px-6 pt-6 md:px-8 md:pt-8 pb-2 border-b border-border">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22 }}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/90 mb-1">
                      {step === 1 && "Welcome"}
                      {step === 2 && "Your focus"}
                      {step === 3 && "Your look"}
                      {step === 4 && "Your modules"}
                      {step === 5 && "Permissions"}
                    </p>
                    <h1 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight">
                      {step === 1 && "Start your workspace"}
                      {step === 2 && "What do you study?"}
                      {step === 3 && "Pick your look"}
                      {step === 4 && "Bring in your modules"}
                      {step === 5 && "Enable microphone"}
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
                          <div className="absolute inset-0 rounded-3xl bg-primary/20 blur-2xl scale-150" />
                          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-primary-alt shadow-xl shadow-primary/30 ring-1 ring-foreground/20">
                            <Sparkles
                              className="h-9 w-9 text-foreground"
                              strokeWidth={1.5}
                            />
                          </div>
                        </motion.div>
                        <div className="space-y-3 max-w-sm">
                          <p className="text-foreground/80 text-[15px] leading-relaxed">
                            Notes, modules, and AI assistance in one place—so
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
                    {step === 3 && <StepLook />}
                    {step === 4 && (
                      <StepCourses
                        value={formData.files}
                        onChange={(val) =>
                          setFormData({ ...formData, files: val })
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
              </div>

              <div className="mt-auto flex items-center justify-between gap-3 px-6 py-5 md:px-8 border-t border-border bg-inset">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep(Math.max(1, step - 1))}
                  disabled={step === 1}
                  className="text-muted-foreground hover:text-foreground hover:bg-foreground/6 rounded-xl px-4"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>

                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={
                    (step === 2 && !formData.major) ||
                    (step === 5 && !formData.permissionsGranted)
                  }
                  className="rounded-xl bg-linear-to-r from-primary to-primary-alt hover:from-primary/90 hover:to-primary-alt/90 text-primary-foreground px-7 shadow-lg shadow-primary/25 border border-border"
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
              className="flex flex-1 flex-col rounded-[1.75rem] border border-foreground/8 bg-inset/50 backdrop-blur-md overflow-hidden shadow-[0_32px_100px_-24px_rgba(0,0,0,0.75)] ring-1 ring-inset ring-foreground/4"
            >
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-inset">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-red-500/35 ring-1 ring-red-500/40" />
                  <span className="h-3 w-3 rounded-full bg-amber-500/35 ring-1 ring-amber-500/40" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500/35 ring-1 ring-emerald-500/40" />
                </div>
                <span className="ml-3 text-[11px] text-muted-foreground/80 font-medium tracking-wide">
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
                    className="rounded-2xl border border-primary/20 bg-linear-to-br from-primary/10 via-primary-alt/5 to-transparent p-6 flex gap-4"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
                      <HintIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      <h3 className="text-base font-semibold text-foreground leading-snug">
                        {hint.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {hint.body}
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>

                <div className="rounded-2xl border border-border bg-card/40 p-6 flex flex-col gap-5 flex-1 min-h-0">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-semibold text-foreground tracking-tight">
                        {formatMajorLabel(formData.major)}
                      </h3>
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-foreground/6 px-3 py-1 text-xs text-foreground/80 ring-1 ring-foreground/8">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                        Fall 2025
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground/80 uppercase tracking-wider">
                        This week
                      </p>
                      <p className="text-2xl font-semibold tabular-nums text-foreground">
                        {formData.files.length > 0
                          ? `${formData.files.length} PDF${formData.files.length > 1 ? "s" : ""}`
                          : "—"}
                      </p>
                      <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                        {step >= 4 ? "Syllabus files" : "Module files"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground/80">
                      <span>Workspace readiness</span>
                      <span className="tabular-nums text-muted-foreground">
                        {Math.round((step / totalSteps) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-linear-to-r from-primary to-primary-alt"
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
                    <div className="rounded-xl border border-border bg-inset p-4 flex flex-col justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-orange-500/15 flex items-center justify-center text-lg">
                          📝
                        </div>
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="h-2 w-16 bg-foreground/15 rounded-full" />
                          <div className="h-1.5 w-10 bg-foreground/10 rounded-full" />
                        </div>
                      </div>
                      <div className="space-y-1.5 mt-4">
                        <div className="h-1.5 w-full bg-foreground/8 rounded-full" />
                        <div className="h-1.5 w-[88%] bg-foreground/6 rounded-full" />
                        <div className="h-1.5 w-[72%] bg-foreground/6 rounded-full" />
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-inset p-4 flex flex-col">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs text-muted-foreground/80">Activity</span>
                        <span className="text-[11px] font-medium text-emerald-400/90">
                          +12%
                        </span>
                      </div>
                      <div className="flex flex-1 items-end gap-1.5 min-h-[72px]">
                        {[40, 70, 45, 90, 60, 80, 50].map((h, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-t-sm bg-primary/15 relative overflow-hidden"
                          >
                            <motion.div
                              className="absolute bottom-0 left-0 right-0 rounded-t-sm bg-linear-to-br from-primary to-primary-alt"
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
