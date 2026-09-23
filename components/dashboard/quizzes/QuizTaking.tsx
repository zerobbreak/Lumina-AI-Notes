"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Id } from "@/types/data-model";
import { useQuizStudyActions } from "@/lib/hooks/quizzes/useQuizStudyActions";
import { useQuizStudyData } from "@/lib/hooks/quizzes/useQuizStudyData";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { QuizResults } from "./QuizResults";

interface QuizTakingProps {
  deckId: string;
}

interface Question {
  _id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export function QuizTaking({ deckId }: QuizTakingProps) {
  const router = useRouter();
  const { deck, questions } = useQuizStudyData(deckId);
  const { saveResult } = useQuizStudyActions();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  // Initialize answers array when questions load
  useEffect(() => {
    if (questions && userAnswers.length === 0) {
      setUserAnswers(new Array(questions.length).fill(-1));
    }
  }, [questions, userAnswers.length]);

  // Load saved answer for current question
  useEffect(() => {
    if (userAnswers[currentQuestionIndex] !== undefined) {
      const savedAnswer = userAnswers[currentQuestionIndex];
      setSelectedAnswer(savedAnswer === -1 ? null : savedAnswer);
    }
  }, [currentQuestionIndex, userAnswers]);

  if (!deck || !questions) {
    return (
      <div className="h-full flex items-center justify-center bg-linear-to-br from-background to-background">
        <div className="flex items-center gap-2 text-muted-foreground/80 animate-pulse">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading quiz...</span>
        </div>
      </div>
    );
  }

  if (showResults) {
    return (
      <QuizResults
        deckId={deckId}
        questions={questions as Question[]}
        userAnswers={userAnswers}
        score={score}
        onRetake={() => {
          setUserAnswers(new Array(questions.length).fill(-1));
          setCurrentQuestionIndex(0);
          setSelectedAnswer(null);
          setShowResults(false);
          setScore(0);
        }}
        onBack={() => router.push("/dashboard?view=quizzes")}
      />
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const allQuestionsAnswered = userAnswers.every((answer) => answer !== -1);

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setUserAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!allQuestionsAnswered) {
      alert("Please answer all questions before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate score
      let correctCount = 0;
      questions.forEach((q: Question, index: number) => {
        if (userAnswers[index] === q.correctAnswer) {
          correctCount++;
        }
      });

      setScore(correctCount);

      // Save result to database
      await saveResult({
        deckId: deckId as Id<"quizDecks">,
        score: correctCount,
        totalQuestions: questions.length,
        answers: userAnswers,
        tzOffsetMinutes: new Date().getTimezoneOffset(),
      });

      setShowResults(true);
    } catch (error) {
      console.error("Failed to submit quiz:", error);
      alert("Failed to submit quiz. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-linear-to-br from-background to-background">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border/60">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard?view=quizzes")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{deck.title}</h1>
            <p className="text-sm text-muted-foreground/80">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">
            Answered: {userAnswers.filter((a) => a !== -1).length} /{" "}
            {questions.length}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-foreground/5">
        <div
          className="h-full bg-linear-to-r from-primary to-primary-alt transition-all duration-300"
          style={{
            width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
          }}
        />
      </div>

      {/* Question Content */}
      <ScrollArea className="flex-1 p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Question */}
          <div className="p-6 rounded-xl bg-foreground/5 border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-6">
              {currentQuestion.question}
            </h2>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  className={`w-full p-4 rounded-lg text-left transition-all duration-200 ${
                    selectedAnswer === index
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-foreground/5 border-border text-foreground/80 hover:bg-foreground/10 hover:border-foreground/20"
                  } border-2`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        selectedAnswer === index
                          ? "border-foreground bg-foreground"
                          : "border-muted-foreground"
                      }`}
                    >
                      {selectedAnswer === index && (
                        <div className="w-3 h-3 rounded-full bg-primary" />
                      )}
                    </div>
                    <span className="flex-1">{option}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Question Navigator */}
          <div className="flex flex-wrap gap-2">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-10 h-10 rounded-lg font-medium transition-all ${
                  index === currentQuestionIndex
                    ? "bg-primary text-primary-foreground"
                    : userAnswers[index] !== -1
                      ? "bg-green-600/20 text-green-400 border border-green-500/30"
                      : "bg-foreground/5 text-muted-foreground border border-border hover:bg-foreground/10"
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between p-6 border-t border-border/60 bg-inset backdrop-blur-md">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </Button>

        {isLastQuestion ? (
          <Button
            onClick={handleSubmit}
            disabled={!allQuestionsAnswered || isSubmitting}
            className="gap-2 bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Submit Quiz
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={selectedAnswer === null}
            className="gap-2 bg-linear-to-r from-primary to-primary-alt hover:from-primary/90 hover:to-primary-alt/90"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

