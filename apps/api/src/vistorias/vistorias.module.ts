import { Module } from "@nestjs/common";
import { PrismaModule } from "../infrastructure/prisma/prisma.module";
import { VistoriasController } from "./vistorias.controller";
import { VistoriasService } from "./vistorias.service";

@Module({
  imports: [PrismaModule],
  controllers: [VistoriasController],
  providers: [VistoriasService],
  exports: [VistoriasService],
})
export class VistoriasModule {}
