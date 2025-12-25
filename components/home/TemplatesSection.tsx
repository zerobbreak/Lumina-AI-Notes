"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FunctionSquare, BookOpen, Quote, FileCode } from "lucide-react";

const templates = [
  {
    id: "stem",
    label: "STEM / Math",
    icon: FunctionSquare,
    title: "Linear Algebra: Eigenvalues",
    content: (
      <div className="space-y-4 font-mono text-sm text-gray-300">
        <div className="p-3 bg-white/5 rounded border border-white/10">
          <p className="text-purple-400 mb-1">// Definition</p>
          <p>
            For a square matrix A, an eigenvector v and eigenvalue λ satisfy:
          </p>
          <code className="block mt-2 text-green-400">Av = λv</code>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-1">Key Properties:</h4>
          <ul className="list-disc pl-4 space-y-1 text-gray-400">
            <li>Trace(A) = Sum of eigenvalues</li>
            <li>Det(A) = Product of eigenvalues</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "humanities",
    label: "History / Lit",
    icon: BookOpen,
    title: "The Industrial Revolution",
    content: (
      <div className="space-y-4 text-sm text-gray-300">
        <div className="flex gap-3 items-start">
          <Quote className="w-8 h-8 text-white/20 shrink-0" />
          <p className="italic text-gray-400">
            "It was the best of times, it was the worst of times..."
          </p>
        </div>
        <div className="h-px bg-white/10" />
        <div>
          <span className="text-yellow-400 font-semibold">
            Impact Analysis:
          </span>
          <p className="mt-1 leading-relaxed">
            Shift from agrarian to industrial society led to urbanization, rise
            of the middle class, and new labor laws.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "cs",
    label: "Comp Sci",
    icon: FileCode,
    title: "React Hooks: useEffect",
    content: (
      <div className="space-y-3 font-mono text-xs">
        <div className="bg-black/50 p-3 rounded border border-white/10 text-gray-300">
          <span className="text-pink-400">useEffect</span>(() =&gt; {"{"} <br />
          &nbsp;&nbsp;<span className="text-blue-400">const</span> sub ={" "}
          <span className="text-yellow-300">subscribe</span>(); <br />
          &nbsp;&nbsp;<span className="text-pink-400">return</span> () =&gt;
          sub.<span className="text-yellow-300">unsubscribe</span>(); <br />
          {"}"}, []);
        </div>
        <div className="flex items-center gap-2 text-green-400 bg-green-900/20 p-2 rounded">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>Handles side effects/cleanup</span>
        </div>
      </div>
    ),
  },
];

export function TemplatesSection() {
  const [activeTab, setActiveTab] = useState(templates[0].id);

  return (
    <section id="templates" className="py-24 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-linear-to-b from-transparent via-indigo-950/10 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center mb-16">
          <Badge
            variant="glass"
            className="mb-4 px-3 py-1 bg-purple-500/10 text-purple-400 border-purple-500/20"
          >
            Templates
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4">
            Notes for Any <span className="text-purple-400">Major</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Whether you're solving equations or analyzing themes, Lumina adapts
            its output style to match your subject.
          </p>
        </div>

        <div className="grid md:grid-cols-12 gap-8 max-w-5xl mx-auto items-start">
          {/* Tabs List */}
          <div className="md:col-span-4 flex flex-col gap-2">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`group flex items-center gap-3 p-4 rounded-xl text-left transition-all duration-300 border ${
                  activeTab === t.id
                    ? "bg-white/10 border-white/20 text-white shadow-lg"
                    : "hover:bg-white/5 border-transparent text-muted-foreground hover:text-white"
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    activeTab === t.id
                      ? "bg-purple-600"
                      : "bg-white/10 group-hover:bg-white/20"
                  }`}
                >
                  <t.icon className="w-5 h-5" />
                </div>
                <span className="font-medium">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Preview Card */}
          <div className="md:col-span-8">
            <AnimatePresence mode="wait">
              {templates.map(
                (t) =>
                  activeTab === t.id && (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="bg-[#121212]/80 border-white/10 backdrop-blur-xl h-[400px] shadow-2xl overflow-hidden relative">
                        {/* Mock Window Controls */}
                        <div className="h-10 border-b border-white/10 flex items-center px-4 gap-2 bg-white/5">
                          <div className="w-3 h-3 rounded-full bg-red-500/50" />
                          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                          <div className="w-3 h-3 rounded-full bg-green-500/50" />
                          <div className="ml-4 text-xs text-gray-500 font-mono">
                            lumina_note_v1.md
                          </div>
                        </div>

                        <CardContent className="p-8">
                          <h3 className="text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">
                            {t.title}
                          </h3>
                          {t.content}
                        </CardContent>

                        {/* Decoration */}
                        <div className="absolute bottom-4 right-4 text-[10px] text-gray-600 uppercase tracking-widest font-bold">
                          Generated by Lumina AI
                        </div>
                      </Card>
                    </motion.div>
                  )
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
