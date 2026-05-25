import { Body, Controller, Delete, Get, Param, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request as ExpressRequest } from "express";
import { DocumentsService } from "./documents.service";
import { CreateDocumentDto, DocumentQueryDto, NewDocumentVersionDto } from "./dto/document.dto";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { Roles } from "../../core/decorators/roles.decorator";
import { AuthUser } from "../../core/types/auth-user";

@ApiTags("documents")
@ApiBearerAuth()
@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  create(
    @Body() dto: CreateDocumentDto,
    @CurrentUser() user: AuthUser,
    @Req() request: ExpressRequest,
  ) {
    return this.documentsService.create(dto, user, request);
  }

  @Post(":id/versions")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  newVersion(
    @Param("id") id: string,
    @Body() dto: NewDocumentVersionDto,
    @CurrentUser() user: AuthUser,
    @Req() request: ExpressRequest,
  ) {
    return this.documentsService.newVersion(id, dto, user, request);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: DocumentQueryDto) {
    return this.documentsService.findAll(user, query, query);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.documentsService.findOne(id, user);
  }

  @Delete(":id")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  remove(@Param("id") id: string, @CurrentUser() user: AuthUser, @Req() request: ExpressRequest) {
    return this.documentsService.remove(id, user, request);
  }
}
