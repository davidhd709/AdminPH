import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import type { PrismaService } from "../prisma/prisma.service";
import type { User} from "@prisma/client";
import { UserRole } from "@prisma/client";
import type { CreateUserDto } from "./dto/create-user.dto";
import type { AuditService } from "../audit/audit.service";

export class UpdateUserDto {
  fullName?: string;
  phone?: string;
  email?: string;
}

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(dto: CreateUserDto, user: any, request: any): Promise<User> {
    const newUser = await this.prisma.user.create({
      data: dto,
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: newUser.companyId,
      entityName: "User",
      entityId: newUser.id,
      action: "CREATE",
      newValue: newUser,
      request,
    });

    return newUser;
  }

  async findOne(id: string, user: any): Promise<User | null> {
    const foundUser = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!foundUser) throw new NotFoundException("User not found");

    if (user.role !== "SUPERADMIN") {
      if (foundUser.companyId !== user.companyId) {
        throw new ForbiddenException("Access denied to this user");
      }
    }

    return foundUser;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
  }

  async update(id: string, dto: UpdateUserDto, user: any, request: any): Promise<User> {
    const oldUser = await this.findOne(id, user);

    const updated = await this.prisma.user.update({
      where: { id },
      data: dto,
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: updated.companyId,
      entityName: "User",
      entityId: id,
      action: "UPDATE",
      oldValue: oldUser,
      newValue: updated,
      request,
    });

    return updated;
  }

  async delete(id: string, user: any, request: any): Promise<User> {
    const oldUser = await this.findOne(id, user);

    if (user.role !== "SUPERADMIN" && user.role !== "COMPANY_ADMIN") {
      throw new ForbiddenException("Insufficient permissions");
    }

    const deleted = await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.log({
      userId: user.sub,
      companyId: oldUser.companyId,
      entityName: "User",
      entityId: id,
      action: "DELETE",
      oldValue: oldUser,
      newValue: deleted,
      request,
    });

    return deleted;
  }
}
