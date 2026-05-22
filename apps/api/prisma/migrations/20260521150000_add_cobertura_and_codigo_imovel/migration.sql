-- AlterTable: Vistoria
ALTER TABLE "vistorias" ADD COLUMN "codigoImovelExterno" TEXT;

-- AlterTable: User
ALTER TABLE "users" ADD COLUMN "providerId" TEXT;

-- CreateIndex
CREATE INDEX "vistorias_tenantId_codigoImovelExterno_idx" ON "vistorias"("tenantId", "codigoImovelExterno");

-- CreateIndex
CREATE INDEX "users_tenantId_providerId_idx" ON "users"("tenantId", "providerId");

-- CreateTable: VistoriadorCobertura
CREATE TABLE "vistoriador_cobertura" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "vistoriadorId" UUID NOT NULL,
    "uf" VARCHAR(2) NOT NULL,
    "cidade" TEXT,
    "bairro" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vistoriador_cobertura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vistoriador_cobertura_tenantId_vistoriadorId_idx" ON "vistoriador_cobertura"("tenantId", "vistoriadorId");

-- CreateIndex
CREATE INDEX "vistoriador_cobertura_tenantId_uf_cidade_bairro_idx" ON "vistoriador_cobertura"("tenantId", "uf", "cidade", "bairro");

-- AddForeignKey
ALTER TABLE "vistoriador_cobertura" ADD CONSTRAINT "vistoriador_cobertura_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vistoriador_cobertura" ADD CONSTRAINT "vistoriador_cobertura_vistoriadorId_fkey" FOREIGN KEY ("vistoriadorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
