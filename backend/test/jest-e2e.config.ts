import type { Config } from "jest";

/**
 * Jest config para tests end-to-end (test/*.e2e-spec.ts).
 * Requiere una BD PostgreSQL de test accesible vía DATABASE_URL.
 */
const config: Config = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "..",
  testRegex: ".e2e-spec\\.ts$",
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.json" }],
  },
  testEnvironment: "node",
  testTimeout: 30000,
};

export default config;
