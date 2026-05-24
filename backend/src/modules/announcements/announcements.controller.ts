import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request as ExpressRequest } from "express";
import { AnnouncementsService } from "./announcements.service";
import { AnnouncementQueryDto, CreateAnnouncementDto } from "./dto/announcement.dto";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { Roles } from "../../core/decorators/roles.decorator";
import { PaginationDto } from "../../core/dto/pagination.dto";
import { AuthUser } from "../../core/types/auth-user";

@ApiTags("announcements")
@ApiBearerAuth()
@Controller("announcements")
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  create(
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() user: AuthUser,
    @Req() request: ExpressRequest,
  ) {
    return this.announcementsService.create(dto, user, request);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: AnnouncementQueryDto,
    @Query() pagination: PaginationDto,
  ) {
    return this.announcementsService.findAll(user, query, pagination);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.announcementsService.findOne(id, user);
  }

  @Post(":id/read")
  markAsRead(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.announcementsService.markAsRead(id, user);
  }
}
