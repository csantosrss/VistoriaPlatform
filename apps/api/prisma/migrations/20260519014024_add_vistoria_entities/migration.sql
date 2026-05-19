-- CreateEnum
CREATE TYPE "StatusVistoria" AS ENUM ('SOLICITADA', 'ROTEADA', 'AGENDADA', 'CONFIRMADA', 'EM_EXECUCAO', 'LAUDO_PENDENTE', 'LAUDO_APROVADO', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoVistoria" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateTable
CREATE TABLE "vistorias" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "status" "StatusVistoria" NOT NULL DEFAULT 'SOLICITADA',
    "tipo" "TipoVistoria" NOT NULL,
    "enderecoLogradouro" TEXT NOT NULL,
    "enderecoNumero" TEXT NOT NULL,
    "enderecoComplemento" TEXT,
    "enderecoBairro" TEXT NOT NULL,
    "enderecoCidade" TEXT NOT NULL,
    "enderecoUf" VARCHAR(2) NOT NULL,
    "enderecoCep" VARCHAR(9) NOT NULL,
    "contatoNome" TEXT NOT NULL,
    "contatoTelefone" TEXT NOT NULL,
    "contatoEmail" TEXT,
    "observacoes" TEXT,
    "vistoriadorId" UUID,
    "providerId" TEXT,
    "agendadoPara" TIMESTAMP(3),
    "concluidoEm" TIMESTAMP(3),
    "canceladoEm" TIMESTAMP(3),
    "canceladoMotivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vistorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vistoria_transicoes" (
    "id" UUID NOT NULL,
    "vistoriaId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "de" "StatusVistoria",
    "para" "StatusVistoria" NOT NULL,
    "motivo" TEXT,
    "executadoPor" UUID,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vistoria_transicoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vistorias_tenantId_status_idx" ON "vistorias"("tenantId", "status");

-- CreateIndex
CREATE INDEX "vistorias_tenantId_createdAt_idx" ON "vistorias"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "vistorias_tenantId_vistoriadorId_idx" ON "vistorias"("tenantId", "vistoriadorId");

-- CreateIndex
CREATE INDEX "vistoria_transicoes_vistoriaId_idx" ON "vistoria_transicoes"("vistoriaId");

-- CreateIndex
CREATE INDEX "vistoria_transicoes_tenantId_createdAt_idx" ON "vistoria_transicoes"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "vistorias" ADD CONSTRAINT "vistorias_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vistorias" ADD CONSTRAINT "vistorias_vistoriadorId_fkey" FOREIGN KEY ("vistoriadorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vistoria_transicoes" ADD CONSTRAINT "vistoria_transicoes_vistoriaId_fkey" FOREIGN KEY ("vistoriaId") REFERENCES "vistorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;
