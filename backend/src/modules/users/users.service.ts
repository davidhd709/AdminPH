import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { User } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateMeDto } from "./dto/update-me.dto";
import { AuditService } from "../audit/audit.service";

/**
 * Vista pública de User: sin password, sin contadores de lockout.
 * Usar SIEMPRE en respuestas HTTP — nunca exponer User crudo.
 */
export type SafeUser = Omit<
  User,
  "password" | "failedLoginCount" | "lastFailedLoginAt" | "lockedUntil"
>;

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

  static toSafeUser(user: User): SafeUser {
    const {
      password: _pwd,
      failedLoginCount: _fc,
      lastFailedLoginAt: _lf,
      lockedUntil: _lu,
      ...safe
    } = user;
    return safe;
  }

  async create(dto: CreateUserDto, user: any, request: any): Promise<SafeUser> {
    const hashed = await bcrypt.hash(dto.password, 10);
    const newUser = await this.prisma.user.create({
      data: { ...dto, password: hashed },
    });

    const safe = UsersService.toSafeUser(newUser);
    await this.auditService.log({
      userId: user.sub,
      companyId: newUser.companyId,
      entityName: "User",
      entityId: newUser.id,
      action: "CREATE",
      newValue: safe,
      request,
    });

    return safe;
  }

  async findOne(id: string, user: any): Promise<SafeUser> {
    const foundUser = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!foundUser) throw new NotFoundException("User not found");

    if (user.role !== "SUPERADMIN") {
      if (foundUser.companyId !== user.companyId) {
        throw new ForbiddenException("Access denied to this user");
      }
    }

    return UsersService.toSafeUser(foundUser);
  }

  /**
   * Uso interno: retorna el User completo (incluyendo password hash y campos
   * de lockout). NO exponer al cliente.
   */
  async findRawById(id: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { id, deletedAt: null } });
  }

  /** El propio usuario edita su perfil (fullName, phone). */
  async updateMe(userId: string, dto: UpdateMeDto, request: any): Promise<SafeUser> {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
    const safe = UsersService.toSafeUser(updated);
    await this.auditService.log({
      userId,
      companyId: updated.companyId,
      entityName: "User",
      entityId: userId,
      action: "UPDATE",
      newValue: safe,
      request,
    });
    return safe;
  }

  /**
   * Cambia la contraseña del propio usuario. Verifica la contraseña actual,
   * persiste la nueva hasheada y registra CHANGE_PASSWORD. NO revoca tokens
   * (eso lo orquesta el controller para evitar acoplar a AuthService).
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
    request: any,
  ): Promise<void> {
    const user = await this.findRawById(userId);
    if (!user) throw new NotFoundException("User not found");

    const matches = await bcrypt.compare(oldPassword, user.password);
    if (!matches) throw new BadRequestException("Current password is incorrect");

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    await this.auditService.log({
      userId,
      companyId: user.companyId,
      entityName: "User",
      entityId: userId,
      action: "CHANGE_PASSWORD",
      request,
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
  }

  async update(id: string, dto: UpdateUserDto, user: any, request: any): Promise<SafeUser> {
    const oldUser = await this.findOne(id, user);

    const updated = await this.prisma.user.update({
      where: { id },
      data: dto,
    });

    const safe = UsersService.toSafeUser(updated);
    await this.auditService.log({
      userId: user.sub,
      companyId: updated.companyId,
      entityName: "User",
      entityId: id,
      action: "UPDATE",
      oldValue: oldUser,
      newValue: safe,
      request,
    });

    return safe;
  }

  async delete(id: string, user: any, request: any): Promise<SafeUser> {
    const oldUser = await this.findOne(id, user);

    if (user.role !== "SUPERADMIN" && user.role !== "COMPANY_ADMIN") {
      throw new ForbiddenException("Insufficient permissions");
    }

    const deleted = await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    const safe = UsersService.toSafeUser(deleted);
    await this.auditService.log({
      userId: user.sub,
      companyId: oldUser.companyId,
      entityName: "User",
      entityId: id,
      action: "DELETE",
      oldValue: oldUser,
      newValue: safe,
      request,
    });

    return safe;
  }
}
