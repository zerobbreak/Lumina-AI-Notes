"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateNote } from "@/lib/mutations/notes/useCreateNote";
import { HomeCard } from "./parts";

/** A one-line box that saves to Capture as a quick note. */
export function QuickCaptureCard() {
  const [text, setText] = useState("");
  const createNote = useCreateNote();

  const save = () => {
    const title = text.trim();
    if (!title) return;
    createNote.mutate(
      { title: title.slice(0, 500), noteType: "quick" },
      {
        onSuccess: () => {
          setText("");
          toast.success("Saved to Capture");
        },
        onError: () => toast.error("Couldn't save that. Try again."),
      },
    );
  };

  return (
    <HomeCard className="p-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <label htmlFor="home-quick-capture" className="sr-only">
          Quick capture
        </label>
        <Input
          id="home-quick-capture"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Quick capture: an idea, a question, a to-do…"
          className="h-9 min-w-0 flex-1 bg-background"
        />
        <Button type="submit" size="sm" variant="outline" className="h-9" disabled={!text.trim() || createNote.isPending}>
          Save
        </Button>
      </form>
    </HomeCard>
  );
}
