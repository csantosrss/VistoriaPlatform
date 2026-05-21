-- CreateTable
CREATE TABLE "agenda_slots" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "vistoriadorId" UUID NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "disponivel" BOOLEAN NOT NULL DEFAULT true,
    "motivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agenda_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agenda_slots_tenantId_vistoriadorId_inicio_idx" ON "agenda_slots"("tenantId", "vistoriadorId", "inicio");

-- CreateIndex
CREATE INDEX "agenda_slots_tenantId_inicio_fim_idx" ON "agenda_slots"("tenantId", "inicio", "fim");

-- AddForeignKey
ALTER TABLE "agenda_slots" ADD CONSTRAINT "agenda_slots_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_slots" ADD CONSTRAINT "agenda_slots_vistoriadorId_fkey" FOREIGN KEY ("vistoriadorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
