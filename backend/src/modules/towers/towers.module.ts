import { Module } from "@nestjs/common";
import { TowersService } from "./towers.service";
import { TowersController } from "./towers.controller";

@Module({
  providers: [TowersService],
  controllers: [TowersController],
  exports: [TowersService],
})
export class TowersModule {}
