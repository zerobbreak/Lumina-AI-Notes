"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  ChevronRight,
  Sparkles,
  Zap,
  MoreHorizontal,
  BrainCircuit,
  Code,
  Dna,
  TrendingUp,
  Calculator,
  Gavel,
  BookOpen,
  Landmark,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// --- Theme & Content Definitions ---
const THEMES: Record<string, any> = {
  cs: {
    label: "Computer Science",
    primary: "indigo",
    accent: "cyan",
    gradient: "from-indigo-500/10 to-cyan-500/10",
    icon: Code,
    grounding: "StackOverflow, MDN Docs, Course Repo",
    mockData: {
      course: "CS 101",
      title: "Algorithmic Complexity & Big O",
      subtitle: "Lecture 4: Big O Notation",
      text1:
        "Today we discussed how we measure the efficiency of algorithms. The key takeaway is that we care about how the runtime grows as the input size `n` approaches infinity.",
      aiTitle: "Code Analysis",
      aiContent: [
        {
          label: "O(1)",
          desc: "Constant time. Best case. (e.g., Array lookup)",
        },
        {
          label: "O(n)",
          desc: "Linear time. Grows with input. (e.g., Linear search)",
        },
        {
          label: "O(n²)",
          desc: "Quadratic time. Avoid for large inputs. (e.g., Nested loops)",
        },
      ],
      formula: "T(n) = aT(n/b) + f(n)",
    },
  },
  biology: {
    label: "Biology",
    primary: "emerald",
    accent: "teal",
    gradient: "from-emerald-500/10 to-teal-500/10",
    icon: Dna,
    grounding: "PubMed, Campbell Biology (12th Ed), NCBI",
    mockData: {
      course: "BIO 101",
      title: "Cellular Respiration & ATP",
      subtitle: "Module 3: Metabolic Pathways",
      text1:
        "Cellular respiration is the process by which cells derive energy from glucose. The chemical bond energy in glucose is converted into ATP, the primary energy currency of the cell.",
      aiTitle: "Molecule Breakdown",
      aiContent: [
        {
          label: "Glycolysis",
          desc: "Occurs in cytoplasm. Anaerobic process.",
        },
        {
          label: "Krebs Cycle",
          desc: "Mitochondrial matrix. Generates NADH/FADH2.",
        },
        { label: "ETC", desc: "Inner membrane. Produces bulk of ATP (32-34)." },
      ],
      formula: "C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + ATP",
    },
  },
  business: {
    label: "Business",
    primary: "amber",
    accent: "blue",
    gradient: "from-amber-500/10 to-blue-500/10",
    icon: TrendingUp,
    grounding: "Wall Street Journal, Harvard Business Review, MarketData API",
    mockData: {
      course: "ECON 201",
      title: "Market Equilibrium & Elasticity",
      subtitle: "Week 5: Supply and Demand",
      text1:
        "Elasticity measures how responsive the quantity demanded or supplied is to a change in price. Understanding this is crucial for pricing strategies and revenue optimization.",
      aiTitle: "Market Analysis",
      aiContent: [
        {
          label: "PED > 1",
          desc: "Elastic. Price helps, but volume drops significantly.",
        },
        {
          label: "PED < 1",
          desc: "Inelastic. Essential goods. Price hikes increase revenue.",
        },
        {
          label: "Unitary",
          desc: "Change in price leads to proportional change in Q.",
        },
      ],
      formula: "PED = (%ΔQ) / (%ΔP)",
    },
  },
  engineering: {
    label: "Engineering",
    primary: "orange",
    accent: "slate",
    gradient: "from-orange-500/10 to-slate-500/10",
    icon: Calculator,
    grounding: "IEEE, Engineering Toolbox, CAD Library",
    mockData: {
      course: "MECH 220",
      title: "Thermodynamics: Second Law",
      subtitle: "Chapter 6: Entropy",
      text1:
        "The Second Law dictates the direction of natural processes. It states that the total entropy of an isolated system can never decrease over time.",
      aiTitle: "System Constraints",
      aiContent: [
        { label: "Closed System", desc: "Mass constant, energy can transfer." },
        { label: "Adiabatic", desc: "No heat transfer (Q=0)." },
        {
          label: "Isentropic",
          desc: "Constant entropy (Ideal reversible process).",
        },
      ],
      formula: "ΔS_universe = ΔS_system + ΔS_surr ≥ 0",
    },
  },
  medicine: {
    label: "Medicine",
    primary: "rose",
    accent: "pink",
    gradient: "from-rose-500/10 to-pink-500/10",
    icon: Stethoscope,
    grounding: "PubMed, MedlinePlus, Gray's Anatomy",
    mockData: {
      course: "MED 101",
      title: "Cardiovascular System Physiology",
      subtitle: "Lecture 8: Cardiac Cycle",
      text1:
        "The cardiac cycle consists of two phases: systole (contraction) and diastole (relaxation). Understanding pressure-volume loops is critical for diagnosing heart failure.",
      aiTitle: "Clinical Notes",
      aiContent: [
        {
          label: "Preload",
          desc: "Volume of blood in ventricles at end of diastole.",
        },
        {
          label: "Afterload",
          desc: "Resistance left ventricle must overcome to circulate blood.",
        },
        {
          label: "Ejection Fraction",
          desc: "Percentage of blood leaving your heart each time it contracts.",
        },
      ],
      formula: "CO = HR × SV",
    },
  },
  law: {
    label: "Law",
    primary: "slate",
    accent: "zinc",
    gradient: "from-slate-500/10 to-gray-500/10",
    icon: Gavel,
    grounding: "LexisNexis, The Constitution, Supreme Court Database",
    mockData: {
      course: "LAW 200",
      title: "Constitutional Law: Due Process",
      subtitle: "Amendment XIV Analysis",
      text1:
        "Procedural due process requires government officials to follow fair procedures before depriving a person of life, liberty, or property.",
      aiTitle: "Case Precedents",
      aiContent: [
        {
          label: "Mathews v. Eldridge",
          desc: "Establishes the three-part test for due process.",
        },
        {
          label: "Goldberg v. Kelly",
          desc: "Hearing required before termination of welfare benefits.",
        },
        {
          label: "Gideon v. Wainwright",
          desc: "Right to counsel in criminal cases.",
        },
      ],
      formula: "Life + Liberty + Property",
    },
  },
  history: {
    label: "History",
    primary: "amber",
    accent: "stone",
    gradient: "from-amber-500/10 to-stone-500/10",
    icon: Landmark,
    grounding: "JSTOR, Project Gutenberg, National Archives",
    mockData: {
      course: "HIST 305",
      title: "The Industrial Revolution",
      subtitle: "Unit 4: Social Impact",
      text1:
        "The transition to new manufacturing processes in Great Britain, continental Europe, and the United States, in the period from about 1760 to sometime between 1820 and 1840.",
      aiTitle: "Historical Analysis",
      aiContent: [
        {
          label: "Urbanization",
          desc: "Massive shift from rural to urban living.",
        },
        {
          label: "Class_Struggle",
          desc: "Rise of the proletariat and bourgeoisie.",
        },
        {
          label: "Luddites",
          desc: "Workers who destroyed machinery they believed threatened their jobs.",
        },
      ],
      formula: "Steam + Coal = Progress?",
    },
  },
  other: {
    label: "General Studies",
    primary: "violet",
    accent: "fuchsia",
    gradient: "from-violet-500/10 to-fuchsia-500/10",
    icon: BookOpen,
    grounding: "Google Scholar, Wikipedia, Course Reader",
    mockData: {
      course: "GEN 101",
      title: "Introduction to Critical Thinking",
      subtitle: "Module 1: Logic & Fallacies",
      text1:
        "Critical thinking is the objective analysis and evaluation of an issue in order to form a judgment. It requires us to check our biases and validate our sources.",
      aiTitle: "Common Fallacies",
      aiContent: [
        {
          label: "Ad Hominem",
          desc: "Attacking the person rather than the argument.",
        },
        {
          label: "Straw Man",
          desc: "Misrepresenting an argument to make it easier to attack.",
        },
        {
          label: "Slippery Slope",
          desc: "Asserting a relatively small first step leads to a chain of related events.",
        },
      ],
      formula: "Premise + Premise -> Conclusion",
    },
  },
  default: {
    label: "General Studies",
    primary: "indigo",
    accent: "purple",
    gradient: "from-indigo-500/10 to-purple-500/10",
    icon: BookOpen,
    grounding: "Course Syllabus, Lecture Notes, Wikipedia",
    mockData: {
      course: "GEN 101",
      title: "Introduction to Research Methods",
      subtitle: "Unit 1: Foundations",
      text1:
        "Research begins with a well-formulated question. The validity of your results depends entirely on the rigorous methodology applied during data collection.",
      aiTitle: "Key Concepts",
      aiContent: [
        {
          label: "Qualitative",
          desc: "Interviews, observations, open-ended data.",
        },
        {
          label: "Quantitative",
          desc: "Numerical data, statistical analysis.",
        },
        {
          label: "Mixed Methods",
          desc: "Integrating both for comprehensive insight.",
        },
      ],
      formula: "Reliability ≠ Validity",
    },
  },
};

export default function DashboardPage() {
  const { user } = useUser();
  const userData = useQuery(api.users.getUser);

  // Resolve Theme
  // If userData is loading or not found, major might be undefined.
  // We'll fallback to 'default' if major isn't in our list.
  const majorKey = userData?.major?.toLowerCase() || "default";
  const theme = THEMES[majorKey] || THEMES["default"];
  const isLoaded = userData !== undefined;

  // Colors for inline styles (since Tailwind class interpolation is tricky with dynamic values, we use style objects or specific maps if preferred, but for now we'll stick to a consistent layout and just swap content/accent colors where possible via classes if we map them or just use generic styles with dynamic class names if strictly defined).
  // Actually, to keep it safe with Tailwind compiler, I'll limit dynamic class construction.
  // Instead, I'll use the specific data content mainly.

  if (!isLoaded)
    return (
      <div className="h-full bg-black flex items-center justify-center text-gray-500">
        Loading Workspace...
      </div>
    );

  return (
    <div className="h-full flex flex-col relative">
      {/* Header - AI Grounding */}
      <div className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-black/5 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{theme.mockData.course}</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white font-medium">
              {theme.mockData.subtitle}
            </span>
          </div>

          {/* AI Grounding Pill */}
          <div
            className={`flex items-center gap-2 bg-${theme.primary}-500/10 border border-${theme.primary}-500/20 rounded-full px-3 py-1 text-xs text-${theme.primary}-300`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Grounding: {theme.grounding}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            <div
              className={`w-7 h-7 rounded-full bg-${theme.primary}-500 border-2 border-black flex items-center justify-center text-[10px] text-white`}
            >
              AI
            </div>
            <div className="w-7 h-7 rounded-full bg-gray-600 border-2 border-black" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Editor Canvas */}
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto py-12 px-8 space-y-8">
          {/* Title Block */}
          <div className="group relative">
            <h1 className="text-4xl font-bold text-white mb-2">
              {theme.mockData.title}
            </h1>
            <p className="text-xl text-gray-500">
              October 14th, 2025 • Lecture Notes
            </p>
          </div>

          <Separator className="bg-white/10" />

          {/* Standard Text Block */}
          <div className="group relative pl-4 border-l-2 border-transparent hover:border-white/10 transition-colors">
            <p className="text-gray-300 leading-relaxed text-lg">
              {theme.mockData.text1}
            </p>
          </div>

          {/* AI Block - Concept Summary */}
          <div className="relative group">
            <div
              className={`absolute inset-0 bg-gradient-to-r ${theme.gradient} rounded-xl -m-2 opacity-0 group-hover:opacity-100 transition-opacity`}
            />
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 relative overflow-hidden">
              <div
                className={`absolute top-0 left-0 w-1 h-full bg-${theme.primary}-500`}
              />
              <div
                className={`flex items-center gap-2 mb-3 text-${theme.primary}-400`}
              >
                <Bot className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {theme.mockData.aiTitle}
                </span>
              </div>
              <ul className="space-y-2 text-gray-300">
                {theme.mockData.aiContent.map((item: any, i: number) => (
                  <li key={i} className="flex gap-2">
                    <span className={`text-${theme.primary}-400`}>•</span>
                    <span>
                      <strong>{item.label}</strong>: {item.desc}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Standard Text Block */}
          <div className="group relative pl-4 border-l-2 border-transparent hover:border-white/10 transition-colors">
            <h2 className="text-2xl font-semibold text-white mb-3">
              Key Formula / Concept
            </h2>
            <p className="text-gray-300 leading-relaxed text-lg mb-4">
              The core principle we derived today is expressed as:
            </p>
          </div>

          {/* Block - Math/Formula */}
          <div className="flex justify-center my-6">
            <div className="bg-[#0F0F12] border border-white/10 rounded-lg px-8 py-6 shadow-2xl">
              <span className={`font-mono text-xl text-${theme.accent}-400`}>
                {theme.mockData.formula}
              </span>
            </div>
          </div>

          {/* Cursor / New Block Placeholder */}
          <div className="flex items-center gap-2 text-gray-600 animate-pulse">
            <span className="text-xl">|</span>
            <span className="text-sm">Type "/" for commands</span>
          </div>

          {/* Spacer for bottom dock */}
          <div className="h-24" />
        </div>
      </ScrollArea>

      {/* Floating Glass Dock */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
        <div className="flex items-center gap-2 bg-[#18181B]/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-2xl shadow-indigo-500/10">
          <Button
            variant="ghost"
            className="text-gray-300 hover:text-white hover:bg-white/10 rounded-xl gap-2 h-10 px-4"
          >
            <BrainCircuit className="w-4 h-4 text-purple-400" />
            Generate Quiz
          </Button>
          <Separator orientation="vertical" className="h-6 bg-white/10" />
          <Button
            variant="ghost"
            className="text-gray-300 hover:text-white hover:bg-white/10 rounded-xl gap-2 h-10 px-4"
          >
            <Zap className="w-4 h-4 text-yellow-400" />
            Simplify
          </Button>
          <Separator orientation="vertical" className="h-6 bg-white/10" />
          <Button
            variant="default"
            className={`bg-${theme.primary}-600 hover:bg-${theme.primary}-500 text-white rounded-xl gap-2 h-10 px-4 shadow-[0_0_15px_rgba(79,70,229,0.4)]`}
          >
            <Sparkles className="w-4 h-4" />
            Ask Lumina
          </Button>
        </div>
      </div>
    </div>
  );
}
