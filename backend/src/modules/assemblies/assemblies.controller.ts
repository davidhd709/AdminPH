import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request as ExpressRequest } from "express";
import { AssembliesService } from "./assemblies.service";
import {
  AssemblyQueryDto,
  CastVoteDto,
  CreateAssemblyDto,
  CreateVotingDto,
  RegisterAttendanceDto,
  UpdateAssemblyStatusDto,
} from "./dto/assembly.dto";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { Roles } from "../../core/decorators/roles.decorator";
import { PaginationDto } from "../../core/dto/pagination.dto";
import { AuthUser } from "../../core/types/auth-user";

@ApiTags("assemblies")
@ApiBearerAuth()
@Controller("assemblies")
export class AssembliesController {
  constructor(private readonly assembliesService: AssembliesService) {}

  // ===== Votings (rutas con prefijo fijo "votings", definidas antes que "/:id"
  // para evitar colisiones de matching) =====

  @Post("votings/:votingId/votes")
  castVote(
    @Param("votingId") votingId: string,
    @Body() dto: CastVoteDto,
    @CurrentUser() user: AuthUser,
    @Req() request: ExpressRequest,
  ) {
    return this.assembliesService.castVote(votingId, dto, user, request);
  }

  @Patch("votings/:votingId/close")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  closeVoting(
    @Param("votingId") votingId: string,
    @CurrentUser() user: AuthUser,
    @Req() request: ExpressRequest,
  ) {
    return this.assembliesService.closeVoting(votingId, user, request);
  }

  @Get("votings/:votingId/results")
  tallyVoting(@Param("votingId") votingId: string, @CurrentUser() user: AuthUser) {
    return this.assembliesService.tallyVoting(votingId, user);
  }

  // ===== Assemblies =====

  @Post()
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  createAssembly(
    @Body() dto: CreateAssemblyDto,
    @CurrentUser() user: AuthUser,
    @Req() request: ExpressRequest,
  ) {
    return this.assembliesService.createAssembly(dto, user, request);
  }

  @Get()
  listAssemblies(
    @CurrentUser() user: AuthUser,
    @Query() query: AssemblyQueryDto,
    @Query() pagination: PaginationDto,
  ) {
    return this.assembliesService.listAssemblies(user, query, pagination);
  }

  @Get(":id")
  getAssembly(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.assembliesService.getAssembly(id, user);
  }

  @Patch(":id/status")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateAssemblyStatusDto,
    @CurrentUser() user: AuthUser,
    @Req() request: ExpressRequest,
  ) {
    return this.assembliesService.updateStatus(id, dto, user, request);
  }

  @Post(":id/attendance")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  registerAttendance(
    @Param("id") id: string,
    @Body() dto: RegisterAttendanceDto,
    @CurrentUser() user: AuthUser,
    @Req() request: ExpressRequest,
  ) {
    return this.assembliesService.registerAttendance(id, dto, user, request);
  }

  @Post(":id/votings")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  createVoting(
    @Param("id") id: string,
    @Body() dto: CreateVotingDto,
    @CurrentUser() user: AuthUser,
    @Req() request: ExpressRequest,
  ) {
    return this.assembliesService.createVoting(id, dto, user, request);
  }
}
