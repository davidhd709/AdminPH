import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request as ExpressRequest } from "express";
import { ReservationsService } from "./reservations.service";
import {
  CreateCommonAreaDto,
  CreateReservationDto,
  ReservationQueryDto,
  ReviewReservationDto,
} from "./dto/reservation.dto";
import { CurrentUser } from "../../core/decorators/current-user.decorator";
import { Roles } from "../../core/decorators/roles.decorator";
import { PaginationDto } from "../../core/dto/pagination.dto";
import { AuthUser } from "../../core/types/auth-user";

@ApiTags("reservations")
@ApiBearerAuth()
@Controller("reservations")
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post("areas")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  createArea(
    @Body() dto: CreateCommonAreaDto,
    @CurrentUser() user: AuthUser,
    @Req() request: ExpressRequest,
  ) {
    return this.reservationsService.createArea(dto, user, request);
  }

  @Get("areas")
  listAreas(
    @CurrentUser() user: AuthUser,
    @Query("propertyId") propertyId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.reservationsService.listAreas(user, propertyId, pagination);
  }

  @Post()
  createReservation(
    @Body() dto: CreateReservationDto,
    @CurrentUser() user: AuthUser,
    @Req() request: ExpressRequest,
  ) {
    return this.reservationsService.createReservation(dto, user, request);
  }

  @Get()
  listReservations(
    @CurrentUser() user: AuthUser,
    @Query() query: ReservationQueryDto,
    @Query() pagination: PaginationDto,
  ) {
    return this.reservationsService.listReservations(user, query, pagination);
  }

  @Patch(":id/review")
  @Roles("SUPERADMIN", "COMPANY_ADMIN", "PROPERTY_ADMIN")
  review(
    @Param("id") id: string,
    @Body() dto: ReviewReservationDto,
    @CurrentUser() user: AuthUser,
    @Req() request: ExpressRequest,
  ) {
    return this.reservationsService.review(id, dto, user, request);
  }

  @Patch(":id/cancel")
  cancel(@Param("id") id: string, @CurrentUser() user: AuthUser, @Req() request: ExpressRequest) {
    return this.reservationsService.cancel(id, user, request);
  }
}
