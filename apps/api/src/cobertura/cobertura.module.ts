import { Module } from "@nestjs/common";
import { PrismaModule } from "../infrastructure/prisma/prisma.module";
import { CoberturaController } from "./cobertura.controller";
import { CoberturaService } from "./cobertura.service";

@Module({
  imports: [PrismaModule],
  controllers: [CoberturaController],
  providers: [CoberturaService],
  exports: [CoberturaService],
})
export class CoberturaModule {}
