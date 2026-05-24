import { PaginatedResult, PaginationDto } from "../dto/pagination.dto";

/**
 * Delegate mínimo de un modelo Prisma: lo que `paginate` necesita.
 * Se tipa laxo (`any` en los métodos) porque los delegates generados de
 * Prisma tienen firmas con overloads específicas por modelo que no son
 * asignables a una interface común estricta.
 */
interface PaginatableDelegate {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findMany: (args: any) => Promise<any[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  count: (args: any) => Promise<number>;
}

/**
 * Ejecuta findMany + count en paralelo y arma la respuesta paginada.
 *
 * @param delegate  un delegate de Prisma (ej. prisma.company).
 * @param where     filtro Prisma (incluir deletedAt: null donde aplique).
 * @param pagination page/pageSize/sortBy/sortOrder.
 * @param options   include opcional y campo de orden por defecto.
 */
export async function paginate<T>(
  delegate: PaginatableDelegate,
  where: Record<string, unknown>,
  pagination: PaginationDto,
  options?: { include?: unknown; defaultSortBy?: string },
): Promise<PaginatedResult<T>> {
  const { page, pageSize, sortBy, sortOrder } = pagination;
  const skip = (page - 1) * pageSize;
  const orderField = sortBy ?? options?.defaultSortBy ?? "createdAt";

  const [items, total] = await Promise.all([
    delegate.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { [orderField]: sortOrder },
      include: options?.include,
    }),
    delegate.count({ where }),
  ]);

  return {
    items: items as T[],
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 0,
    },
  };
}
