"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mic, PenLine, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/hooks/useDashboard";
import { useCreateNoteFlow } from "@/hooks/useCreateNoteFlow";
import { UploadDialog } from "@/components/dashboard/dialogs/UploadDialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function ActionCard({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  disabled,
  pending,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onAction?: () => void;
  disabled?: boolean;
  pending?: boolean;
  accent: string;
}) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-border bg-card p-4 shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:bg-black/40 dark:shadow-none dark:ring-0",
        disabled && "opacity-70",
      )}
    >
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", accent)}>
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{description}</p>
      <Button
        size="sm"
        variant={disabled ? "ghost" : "outline"}
        disabled={disabled || pending}
        onClick={onAction}
        className="mt-3 h-8 px-2.5 text-xs"
      >
        {disabled && <Lock className="w-3 h-3 mr-1.5" aria-hidden />}
        {pending ? "Creating…" : actionLabel}
      </Button>
    </div>
  );
}

export function GettingStarted({ hasNotes }: { hasNotes: boolean }) {
  const router = useRouter();
  const { setRightSidebarState } = useDashboard();
  const { createNoteFlow } = useCreateNoteFlow();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  const handleWriteNote = async () => {
    try {
      setIsCreatingNote(true);
      const result = await createNoteFlow({ title: "Untitled Note" });
      router.push(`/dashboard?noteId=${result.noteId}`);
    } catch {
      toast.error("Failed to create note");
    } finally {
      setIsCreatingNote(false);
    }
  };

  return (
    <section className="rounded-3xl border border-border bg-card/50 p-6 shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:bg-black/20 dark:ring-0">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-indigo-700 dark:text-indigo-400">
        <Sparkles className="w-4 h-4 shrink-0" aria-hidden />
        Get started
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
        Lumina turns what you capture into notes, flashcards, and quizzes automatically. Try any of these — each takes under a minute.
      </p>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <ActionCard
          icon={<PenLine className="w-4 h-4 text-indigo-700 dark:text-indigo-300" aria-hidden />}
          accent="bg-indigo-100 dark:bg-indigo-500/10"
          title="Write a note"
          description="A fast, structured editor built for studying."
          actionLabel="New note"
          pending={isCreatingNote}
          onAction={handleWriteNote}
        />
        <ActionCard
          icon={<Upload className="w-4 h-4 text-cyan-700 dark:text-cyan-300" aria-hidden />}
          accent="bg-cyan-100 dark:bg-cyan-500/10"
          title="Upload material"
          description="Drop a PDF or syllabus and Lumina extracts notes for you."
          actionLabel="Upload file"
          onAction={() => setIsUploadOpen(true)}
        />
        <ActionCard
          icon={<Mic className="w-4 h-4 text-rose-700 dark:text-rose-300" aria-hidden />}
          accent="bg-rose-100 dark:bg-rose-500/10"
          title="Record & transcribe"
          description="Capture a lecture live and get an AI transcript."
          actionLabel="Open Studio"
          onAction={() => setRightSidebarState("open")}
        />
        <ActionCard
          icon={<Sparkles className="w-4 h-4 text-amber-700 dark:text-amber-300" aria-hidden />}
          accent="bg-amber-100 dark:bg-amber-500/10"
          title="Flashcards & quizzes"
          description={
            hasNotes
              ? "Generate study sets from any note in one click."
              : "Unlocks automatically once you have a note."
          }
          actionLabel={hasNotes ? "Open a note" : "Write a note first"}
          disabled={!hasNotes}
          onAction={hasNotes ? () => router.push("/dashboard?view=flashcards") : undefined}
        />
      </div>

      <UploadDialog open={isUploadOpen} onOpenChange={setIsUploadOpen} />
    </section>
  );
}
