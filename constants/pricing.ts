export interface PricingPlan {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  popular: boolean;
}

export const PRICING_PLANS: PricingPlan[] = [
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
