/**
 * commitlint — Conventional Commits
 * https://www.conventionalcommits.org/
 *
 * Tipos permitidos:
 *   feat     -> nueva funcionalidad
 *   fix      -> bugfix
 *   docs     -> solo documentación
 *   style    -> formato, sin cambio de lógica
 *   refactor -> refactor, sin cambio de comportamiento
 *   perf     -> mejora de rendimiento
 *   test     -> agregar/cambiar tests
 *   build    -> build, deps, infra
 *   ci       -> cambios de CI
 *   chore    -> tareas varias (tooling, configs)
 *   revert   -> revertir un commit
 */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "subject-case": [0],
    "header-max-length": [2, "always", 100],
    "body-max-line-length": [0],
    "footer-max-line-length": [0],
  },
};
