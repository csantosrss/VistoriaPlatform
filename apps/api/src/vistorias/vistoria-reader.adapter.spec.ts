import { Test } from "@nestjs/testing";
import { StatusVistoria } from "@prisma/client";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { VistoriaReaderAdapter } from "./vistoria-reader.adapter";

describe("VistoriaReaderAdapter", () => {
  let adapter: VistoriaReaderAdapter;
  const findFirst = jest.fn();
  const prismaMock = { vistoria: { findFirst } };

  beforeEach(async () => {
    findFirst.mockReset();
    const ref = await Test.createTestingModule({
      providers: [
        VistoriaReaderAdapter,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    adapter = ref.get(VistoriaReaderAdapter);
  });

  it("mapeia a row do Prisma para VistoriaSnapshot", async () => {
    const now = new Date("2026-05-26T00:00:00Z");
    findFirst.mockResolvedValueOnce({
      id: "V1",
      tenantId: "T1",
      status: StatusVistoria.AGENDADA,
      codigoImovelExterno: "EXT-1",
      vistoriadorId: "U-9",
      agendadoPara: new Date("2026-07-01T10:00:00Z"),
      concluidoEm: null,
      canceladoEm: null,
      canceladoMotivo: null,
      observacoes: "Levar fita",
      createdAt: now,
      updatedAt: now,
    });

    const snap = await adapter.read("V1", "T1");

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "V1", tenantId: "T1" },
      }),
    );
    expect(snap).toEqual({
      vistoriaId: "V1",
      tenantId: "T1",
      status: StatusVistoria.AGENDADA,
      codigoImovelExterno: "EXT-1",
      vistoriadorId: "U-9",
      agendadoPara: new Date("2026-07-01T10:00:00Z"),
      concluidoEm: null,
      canceladoEm: null,
      canceladoMotivo: null,
      observacoes: "Levar fita",
      createdAt: now,
      updatedAt: now,
    });
  });

  it("retorna null quando a vistoria não existe no tenant (tenant isolation)", async () => {
    findFirst.mockResolvedValueOnce(null);
    const snap = await adapter.read("V-x", "T-x");
    expect(snap).toBeNull();
  });
});
