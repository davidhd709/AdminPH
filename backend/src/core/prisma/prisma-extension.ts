import { PrismaClient } from "@prisma/client";

export function extendPrismaClient(client: PrismaClient) {
  return client.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }) {
          // Soft delete filter is handled at the service level or via a custom middleware
          // since $allModels doesn't easily allow checking for 'deletedAt' on the model type here
          return query(args);
        },
      },
    },
  });
}
