import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Document } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { PaginatedResult, PaginationDto } from "../../core/dto/pagination.dto";
import { paginate } from "../../core/utils/paginate";
import { AuthUser } from "../../core/types/auth-user";
import { CreateDocumentDto, DocumentQueryDto, NewDocumentVersionDto } from "./dto/document.dto";

/** Roles con potestad de subir/actualizar/borrar documentos. */
const STAFF_ROLES = ["SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN"];

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(dto: CreateDocumentDto, user: AuthUser, request: unknown): Promise<Document> {
    if (!STAFF_ROLES.includes(user.role)) {
      throw new ForbiddenException("Only staff can upload documents");
    }

    const property = await this.prisma.property.findFirst({
      where: { id: dto.propertyId, deletedAt: null },
    });
    if (!property) throw new NotFoundException("Property not found");

    await this.assertPropertyAccess(user, property.id, property.companyId);

    const document = await this.prisma.document.create({
      data: {
        companyId: property.companyId,
        propertyId: property.id,
        uploadedById: user.sub,
        type: dto.type,
        title: dto.title,
        description: dto.description ?? null,
        fileUrl: dto.fileUrl,
        version: 1,
      },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: property.companyId,
      propertyId: property.id,
      entityName: "Document",
      entityId: document.id,
      action: "CREATE",
      newValue: document,
      request,
    });

    return document;
  }

  /**
   * Versionamiento simple: cada versión es una fila independiente. Recibe el id
   * de un documento existente, hereda title/type/propertyId/companyId, calcula la
   * mayor `version` entre los docs con el mismo title+propertyId y crea una nueva
   * fila con version+1 y el nuevo fileUrl. La versión vigente es la de mayor
   * `version`.
   */
  async newVersion(
    id: string,
    dto: NewDocumentVersionDto,
    user: AuthUser,
    request: unknown,
  ): Promise<Document> {
    if (!STAFF_ROLES.includes(user.role)) {
      throw new ForbiddenException("Only staff can upload documents");
    }

    const existing = await this.prisma.document.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException("Document not found");

    await this.assertPropertyAccess(user, existing.propertyId, existing.companyId);

    const latest = await this.prisma.document.findFirst({
      where: { propertyId: existing.propertyId, title: existing.title, deletedAt: null },
      orderBy: { version: "desc" },
    });
    const nextVersion = (latest?.version ?? existing.version) + 1;

    const document = await this.prisma.document.create({
      data: {
        companyId: existing.companyId,
        propertyId: existing.propertyId,
        uploadedById: user.sub,
        type: existing.type,
        title: existing.title,
        description: dto.description ?? existing.description,
        fileUrl: dto.fileUrl,
        version: nextVersion,
      },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: existing.companyId,
      propertyId: existing.propertyId,
      entityName: "Document",
      entityId: document.id,
      action: "CREATE",
      newValue: document,
      request,
    });

    return document;
  }

  async findAll(
    user: AuthUser,
    query: DocumentQueryDto,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<Document>> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (query.type) where.type = query.type;

    if (user.role === "SUPERADMIN") {
      if (query.propertyId) where.propertyId = query.propertyId;
    } else if (user.role === "COMPANY_ADMIN") {
      where.companyId = user.companyId;
      if (query.propertyId) where.propertyId = query.propertyId;
    } else if (STAFF_ROLES.includes(user.role)) {
      // PROPERTY_ADMIN: solo sus propiedades asignadas.
      const assigned = await this.assignedPropertyIds(user.sub);
      where.propertyId = { in: assigned };
      if (query.propertyId) where.propertyId = query.propertyId;
    } else {
      // OWNER/RESIDENT/SECURITY: documentos de las propiedades donde tienen
      // asignación; si no tienen ninguna, caen al companyId del usuario.
      const assigned = await this.assignedPropertyIds(user.sub);
      if (assigned.length > 0) {
        where.propertyId = { in: assigned };
      } else {
        where.companyId = user.companyId;
      }
      if (query.propertyId && assigned.includes(query.propertyId)) {
        where.propertyId = query.propertyId;
      }
    }

    return paginate<Document>(this.prisma.document, where, pagination, {
      defaultSortBy: "createdAt",
    });
  }

  async findOne(id: string, user: AuthUser): Promise<Document> {
    const document = await this.prisma.document.findFirst({
      where: { id, deletedAt: null },
    });
    if (!document) throw new NotFoundException("Document not found");

    await this.assertReadAccess(user, document);
    return document;
  }

  async remove(id: string, user: AuthUser, request: unknown): Promise<{ deleted: true }> {
    if (!STAFF_ROLES.includes(user.role)) {
      throw new ForbiddenException("Only staff can delete documents");
    }

    const document = await this.prisma.document.findFirst({
      where: { id, deletedAt: null },
    });
    if (!document) throw new NotFoundException("Document not found");

    await this.assertPropertyAccess(user, document.propertyId, document.companyId);

    await this.prisma.document.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: document.companyId,
      propertyId: document.propertyId,
      entityName: "Document",
      entityId: id,
      action: "DELETE",
      oldValue: document,
      request,
    });

    return { deleted: true };
  }

  // ===== Helpers de acceso =====

  private async assignedPropertyIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.propertyUser.findMany({
      where: { userId },
      select: { propertyId: true },
    });
    return rows.map((r) => r.propertyId);
  }

  private async assertPropertyAccess(
    user: AuthUser,
    propertyId: string,
    companyId: string,
  ): Promise<void> {
    if (user.role === "SUPERADMIN") return;
    if (user.role === "COMPANY_ADMIN") {
      if (companyId !== user.companyId) throw new ForbiddenException("Cross-company access denied");
      return;
    }
    const assignment = await this.prisma.propertyUser.findFirst({
      where: { userId: user.sub, propertyId },
    });
    if (!assignment) throw new ForbiddenException("Not assigned to this property");
  }

  private async assertReadAccess(user: AuthUser, document: Document): Promise<void> {
    if (user.role === "SUPERADMIN") return;
    if (user.role === "COMPANY_ADMIN") {
      if (document.companyId !== user.companyId) throw new ForbiddenException("Access denied");
      return;
    }
    if (STAFF_ROLES.includes(user.role)) {
      await this.assertPropertyAccess(user, document.propertyId, document.companyId);
      return;
    }
    // OWNER/RESIDENT/SECURITY: pueden ver si están asignados a la propiedad o,
    // en su defecto, si el documento pertenece a su empresa.
    const assigned = await this.assignedPropertyIds(user.sub);
    if (assigned.includes(document.propertyId)) return;
    if (user.companyId && document.companyId === user.companyId) return;
    throw new ForbiddenException("Access denied to this document");
  }
}
