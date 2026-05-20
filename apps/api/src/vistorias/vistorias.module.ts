import { Module } from "@nestjs/common";
import { PrismaModule } from "../infrastructure/prisma/prisma.module";
import { ProviderRoutingService } from "@vistoria/integrations";
import { VistoriasController } from "./vistorias.controller";
import { VistoriasService } from "./vistorias.service";
import { VistoriaStatusChangedHandler } from "./handlers/vistoria-status-changed.handler";

@Module({
  imports: [PrismaModule],
  controllers: [VistoriasController],
  providers: [
    VistoriasService,
    ProviderRoutingService,
    VistoriaStatusChangedHandler,
  ],
  exports: [VistoriasService],
})
export class VistoriasModule {}
