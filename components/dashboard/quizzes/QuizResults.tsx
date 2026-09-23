"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Trophy,
  Target,
} from "lucide-react";

interface Question {
  _id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface QuizResultsProps {
  deckId: string;
  questions: Question[];
  userAnswers: number[];
  score: number;
  onRetake: () => void;
  onBack: () => void;
}

export function QuizResults({
  questions,
  userAnswers,
  score,
  onRetake,
  onBack,
}: QuizResultsProps) {
  const totalQuestions = questions.length;
  const percentage = Math.round((score / totalQuestions) * 100);
  const isHighScore = percentage >= 80;

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background to-background">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border/60">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quiz Results</h1>
            <p className="text-sm text-muted-foreground/80">Review your answers</p>
          </div>
        </div>
        <Button
          onClick={onRetake}
          variant="outline"
          className="gap-2 border-border hover:bg-foreground/5"
        >
          <RefreshCw className="w-4 h-4" />
          Retake Quiz
        </Button>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Score Card */}
          <div className="relative overflow-hidden p-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary-alt/20 border border-primary/30">
            {isHighScore && (
              <div className="absolute top-4 right-4">
                <Trophy className="w-12 h-12 text-yellow-400 animate-pulse" />
              </div>
            )}

            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 rounded-full bg-foreground/10">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-foreground">
                  {score} / {totalQuestions}
                </h2>
                <p className="text-lg text-foreground/80">{percentage}% Correct</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-foreground/10 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isHighScore
                    ? "bg-gradient-to-r from-green-500 to-emerald-500"
                    : percentage >= 60
                      ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                      : "bg-gradient-to-r from-red-500 to-pink-500"
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>

            {/* Message */}
            <div className="mt-4 text-center">
              {isHighScore ? (
                <p className="text-green-400 font-medium">
                  Excellent work! You've mastered this material! 🎉
                </p>
              ) : percentage >= 60 ? (
                <p className="text-yellow-400 font-medium">
                  Good effort! Review the questions you missed to improve.
                </p>
              ) : (
                <p className="text-orange-400 font-medium">
                  Keep studying! Review the material and try again.
                </p>
              )}
            </div>
          </div>

          {/* Question Review */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Question Review
            </h3>

            {questions.map((question, index) => {
              const userAnswer = userAnswers[index];
              const isCorrect = userAnswer === question.correctAnswer;

              return (
                <div
                  key={question._id}
                  className={`p-5 rounded-xl border-2 transition-all ${
                    isCorrect
                      ? "bg-green-500/5 border-green-500/30"
                      : "bg-red-500/5 border-red-500/30"
                  }`}
                >
                  {/* Question Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <div
                      className={`p-2 rounded-lg ${
                        isCorrect ? "bg-green-500/20" : "bg-red-500/20"
                      }`}
                    >
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          Question {index + 1}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            isCorrect
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {isCorrect ? "Correct" : "Incorrect"}
                        </span>
                      </div>
                      <p className="text-foreground font-medium">
                        {question.question}
                      </p>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-2 ml-11">
                    {question.options.map((option, optionIndex) => {
                      const isUserAnswer = optionIndex === userAnswer;
                      const isCorrectAnswer =
                        optionIndex === question.correctAnswer;

                      return (
                        <div
                          key={optionIndex}
                          className={`p-3 rounded-lg border ${
                            isCorrectAnswer
                              ? "bg-green-500/10 border-green-500/30 text-green-300"
                              : isUserAnswer
                                ? "bg-red-500/10 border-red-500/30 text-red-300"
                                : "bg-foreground/5 border-border text-muted-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isCorrectAnswer && (
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
                            )}
                            {isUserAnswer && !isCorrectAnswer && (
                              <XCircle className="w-4 h-4 text-red-400" />
                            )}
                            <span>{option}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  {question.explanation && (
                    <div className="mt-4 ml-11 p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-sm text-primary">
                        <span className="font-medium">Explanation: </span>
                        {question.explanation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={onBack}
              variant="outline"
              className="flex-1 border-border hover:bg-foreground/5"
            >
              Back to Quizzes
            </Button>
            <Button
              onClick={onRetake}
              className="flex-1 bg-gradient-to-r from-primary to-primary-alt hover:from-primary/90 hover:to-primary-alt/90 gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retake Quiz
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

