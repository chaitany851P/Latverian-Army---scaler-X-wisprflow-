import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/out/**",
      "**/coverage/**",
      "playwright-report/**",
      "test-results/**",
      "apps/web/next-env.d.ts"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended
);
