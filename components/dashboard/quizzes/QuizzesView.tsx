"use client";

import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardList, Plus, Trash2, Clock, BookOpen, Sparkles } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { GenerateQuizDialog } from "@/components/dashboard/dialogs/GenerateQuizDialog";

interface QuizDeck {
  _id: string;
  title: string;
  questionCount: number;
  lastTakenAt?: number;
}

export function QuizzesView() {
  const router = useRouter();
  const decks = useQuery(api.quizzes.getDecks);
  const deleteDeck = useMutation(api.quizzes.deleteDeck);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);

  const handleTakeQuiz = (deckId: string) => {
    router.push(`/dashboard?view=quizzes&deckId=${deckId}`);
  };

  const handleDeleteDeck = async (deckId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this quiz?")) {
      await deleteDeck({ deckId: deckId as Id<"quizDecks"> });
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-[#050505] to-[#0a0a12]">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10">
            <ClipboardList className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Quizzes</h1>
            <p className="text-sm text-gray-500">
              Test your knowledge with AI-generated quizzes
            </p>
          </div>
        </div>
        <Button
          onClick={() => setIsGenerateOpen(true)}
          className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
        >
          <Sparkles className="w-4 h-4" />
          Generate from Notes
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-6">
        {decks === undefined ? (
          <div className="flex items-center justify-center h-40">
            <div className="flex items-center gap-2 text-gray-500 animate-pulse">
              <ClipboardList className="w-5 h-5" />
              <span>Loading quizzes...</span>
            </div>
          </div>
        ) : decks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center">
            <div className="p-4 rounded-full bg-white/5 mb-4">
              <ClipboardList className="w-12 h-12 text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-300 mb-2">
              No quizzes yet
            </h3>
            <p className="text-sm text-gray-500 max-w-sm mb-4">
              Generate quizzes from your notes to test your understanding and
              prepare for exams.
            </p>
            <Button
              onClick={() => setIsGenerateOpen(true)}
              variant="outline"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Your First Quiz
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.map((deck: QuizDeck) => (
              <div
                key={deck._id}
                onClick={() => handleTakeQuiz(deck._id)}
                className="group relative p-5 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-white/10 cursor-pointer transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <BookOpen className="w-5 h-5 text-purple-400" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDeleteDeck(deck._id, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <h3 className="font-semibold text-white mb-1 truncate">
                  {deck.title}
                </h3>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <ClipboardList className="w-3 h-3" />
                    {deck.questionCount} questions
                  </span>
                  {deck.lastTakenAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(deck.lastTakenAt)}
                    </span>
                  )}
                </div>

                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/0 to-pink-500/0 group-hover:from-purple-500/5 group-hover:to-pink-500/5 transition-all pointer-events-none" />
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <GenerateQuizDialog
        open={isGenerateOpen}
        onOpenChange={setIsGenerateOpen}
      />
    </div>
  );
}

