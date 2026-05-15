import { Prisma } from "@prisma/client";

/**
 * Lista canónica de modelos que tienen columna `deletedAt`.
 * Si agregas `deletedAt` a un modelo nuevo, AGRÉGALO también aquí.
 */
export const SOFT_DELETE_MODELS = [
  "User",
  "Company",
  "Property",
  "Tower",
  "Unit",
  "Owner",
  "Resident",
  "FeeConcept",
  "Fee",
  "Payment",
  "LateFeeConfig",
] as const;

export type SoftDeleteModel = (typeof SOFT_DELETE_MODELS)[number];

function isSoftDeleteModel(model: string | undefined): model is SoftDeleteModel {
  return !!model && (SOFT_DELETE_MODELS as readonly string[]).includes(model);
}

/**
 * Inyecta `deletedAt: null` en `where` si el caller no lo definió ya.
 * Respeta explícitamente cuando el caller PASA `deletedAt` (puede querer
 * buscar registros borrados, ej. recuperación o admin tooling).
 */
function applySoftDeleteFilter<T extends { where?: Record<string, unknown> }>(args: T): T {
  const where = args.where ?? {};
  if ("deletedAt" in where) return args;
  return { ...args, where: { ...where, deletedAt: null } };
}

/**
 * Soft-delete extension para Prisma 7.
 *
 * Comportamiento:
 *   - findFirst / findMany / findUnique / count: agregan `deletedAt: null`
 *     al `where` para modelos con soft delete, salvo que el caller
 *     ya lo haya seteado.
 *   - delete / deleteMany: se convierten en update con `deletedAt = new Date()`.
 *   - update / updateMany: NO se modifican (intencional — caller maneja sus
 *     filtros).
 *
 * Estado: **NO está activada todavía**. Para activarla hay que envolver
 * el PrismaClient en PrismaService y reemplazar `extends PrismaClient`
 * por un patrón wrapper (porque `client.$extends()` retorna un cliente
 * con tipo distinto que no es compatible con herencia directa).
 *
 * Mientras no esté activa, las queries de los services SIGUEN filtrando
 * `deletedAt: null` manualmente (auditado en Fase 2.2). Esta extensión
 * queda lista para activarse en una iteración futura cuando hagamos el
 * refactor del PrismaService.
 *
 * @see PLAN.md — Fase 2.2 (deuda técnica) y nota de refactor.
 */
export const softDeleteExtension = Prisma.defineExtension({
  name: "softDelete",
  query: {
    $allModels: {
      async findFirst({ model, args, query }) {
        if (!isSoftDeleteModel(model)) return query(args);
        return query(applySoftDeleteFilter(args));
      },
      async findMany({ model, args, query }) {
        if (!isSoftDeleteModel(model)) return query(args);
        return query(applySoftDeleteFilter(args));
      },
      async findUnique({ model, args, query }) {
        if (!isSoftDeleteModel(model)) return query(args);
        return query(applySoftDeleteFilter(args));
      },
      async count({ model, args, query }) {
        if (!isSoftDeleteModel(model)) return query(args);
        return query(applySoftDeleteFilter(args));
      },
      async delete({ model, args, query }) {
        if (!isSoftDeleteModel(model)) return query(args);
        // Convierte delete real en soft-delete (update con deletedAt).
        return (query as unknown as (a: unknown) => unknown)({
          ...args,
          data: { deletedAt: new Date() },
        }) as ReturnType<typeof query>;
      },
      async deleteMany({ model, args, query }) {
        if (!isSoftDeleteModel(model)) return query(args);
        return (query as unknown as (a: unknown) => unknown)({
          ...args,
          data: { deletedAt: new Date() },
        }) as ReturnType<typeof query>;
      },
    },
  },
});
