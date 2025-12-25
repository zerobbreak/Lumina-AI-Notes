"use client";

import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const pricingPlans = [
  {
    name: "Starter",
    price: "$0",
    description: "Perfect for trying out semantic notes.",
    features: [
      "5 Hours of Audio Processing / Month",
      "Basic Summary Generation",
      "Search within single lectures",
      "Export to Markdown",
    ],
    cta: "Start for Free",
    popular: false,
  },
  {
    name: "Scholar",
    price: "$12",
    period: "/month",
    description: "The ultimate tool for serious students.",
    features: [
      "Unlimited Audio Processing",
      "Advanced Formula Recognition",
      "Semantic Search across entire semester",
      "Auto-generated Flashcards & Quizzes",
      "Priority Support",
    ],
    cta: "Get Scholar",
    popular: true,
  },
  {
    name: "Institution",
    price: "Custom",
    description: "For universities and departments.",
    features: [
      "SSO Integration",
      "LMS Integration (Canvas/Blackboard)",
      "Department-wide analytics",
      "Admin Dashboard",
      "Dedicated Success Manager",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 relative">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-[400px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
            Invest in Your <span className="text-indigo-400">GPA</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Review smarter, not harder. Choose the plan that fits your academic
            goals.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingPlans.map((plan, idx) => (
            <Card
              key={idx}
              className={`relative flex flex-col border-white/10 bg-black/40 backdrop-blur-md transition-all duration-300 hover:border-white/20 ${
                plan.popular
                  ? "border-indigo-500/50 shadow-[0_0_30px_rgba(79,70,229,0.15)] scale-105 z-10"
                  : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 px-3 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className="text-xl text-white">
                  {plan.name}
                </CardTitle>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-bold text-white">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-muted-foreground text-sm">
                      {plan.period}
                    </span>
                  )}
                </div>
                <CardDescription className="text-gray-400">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {plan.features.map((feature, fIdx) => (
                    <li
                      key={fIdx}
                      className="flex items-start gap-2 text-sm text-gray-300"
                    >
                      <Check
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          plan.popular ? "text-indigo-400" : "text-gray-500"
                        }`}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className={`w-full ${
                    plan.popular
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                >
                  {plan.cta}
                  {plan.popular && <Sparkles className="ml-2 w-4 h-4" />}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
