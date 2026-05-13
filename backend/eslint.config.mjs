import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "prisma/migrations/**",
      "*.config.js",
      "*.config.mjs",
    ],
  },
  ...tseslint.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        project: false,
      },
    },
    rules: {
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "smart"],

      "@typescript-eslint/no-explicit-any": "warn",
      // TODO(fase 1.4): cuando habilitemos `noUnusedLocals: true` en tsconfig,
      // tsc detectará imports/vars sin usar y este check pasa a "error".
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-require-imports": "error",
      // Desactivado: NestJS DI requiere import normal (no `import type`) para
      // que TypeScript emita metadata correcta de reflect-metadata. Si se
      // habilita esta regla, ESLint convertiría inyecciones como
      // `private prisma: PrismaService` a type-only imports y rompería
      // la resolución de dependencias en runtime.
      "@typescript-eslint/consistent-type-imports": "off",
    },
  },
);
