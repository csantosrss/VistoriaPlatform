import { Module } from "@nestjs/common";
import { PrismaModule } from "../infrastructure/prisma/prisma.module";
import { AgendaController } from "./agenda.controller";
import { AgendaService } from "./agenda.service";

@Module({
  imports: [PrismaModule],
  controllers: [AgendaController],
  providers: [AgendaService],
  exports: [AgendaService],
})
export class AgendaModule {}
