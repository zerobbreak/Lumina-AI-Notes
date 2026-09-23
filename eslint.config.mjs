import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import luminaRules from "./eslint-rules/no-raw-colors.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Themed app surfaces must use colour tokens so worlds/accents apply.
  {
    files: [
      "app/dashboard/**/*.{ts,tsx}",
      "app/onboarding/**/*.{ts,tsx}",
      "components/dashboard/**/*.{ts,tsx}",
      "components/onboarding/**/*.{ts,tsx}",
      "components/shared/**/*.{ts,tsx}",
      "components/ui/**/*.{ts,tsx}",
    ],
    plugins: { lumina: luminaRules },
    rules: { "lumina/no-raw-colors": "error" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The Express API has its own package and tsconfig.
    "server/**",
  ]),
]);

export default eslintConfig;
