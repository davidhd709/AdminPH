import type { Config } from "jest";

/**
 * Jest config para tests unitarios (*.spec.ts junto al código fuente).
 * Los E2E usan jest-e2e.config.ts.
 */
const config: Config = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "<rootDir>/../tsconfig.json" }],
  },
  collectCoverageFrom: ["**/*.(t|j)s", "!**/*.module.ts", "!**/main.ts", "!**/*.dto.ts"],
  coverageDirectory: "../coverage",
  testEnvironment: "node",
  moduleNameMapper: {
    "^src/(.*)$": "<rootDir>/$1",
  },
  // Piso anti-regresión: refleja la cobertura ACTUAL (Fase 4). El objetivo es
  // SUBIRLO de forma incremental conforme se agregan tests (meta 70% en
  // services críticos a 6 meses, según PLAN.md). El CI falla si la cobertura
  // BAJA de este piso.
  coverageThreshold: {
    global: {
      statements: 14,
      branches: 11,
      functions: 13,
      lines: 14,
    },
  },
};

export default config;
