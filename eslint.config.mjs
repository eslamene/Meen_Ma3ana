import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import tsconfig from "./tsconfig.json";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"],
    settings: {
      // Ensure '@/*' paths resolve for ESLint import rules
      "import/resolver": {
        typescript: {
          project: tsconfig.compilerOptions.paths["@/*"][0]
        }
      }
    }
  }
];

export default eslintConfig;
