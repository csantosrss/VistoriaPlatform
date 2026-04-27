import {
  REDE_VISTORIAS_TO_STATUS,
  CONCEITUAL_TO_STATUS,
  RedeVistoriasWebhookSchema,
  ConceitualWebhookSchema,
} from "./index";
import { StatusVistoriaSchema } from "../vistoria/status";

describe("webhook status mappings", () => {
  it("maps every Rede Vistorias status to a valid StatusVistoria", () => {
    for (const target of Object.values(REDE_VISTORIAS_TO_STATUS)) {
      expect(StatusVistoriaSchema.safeParse(target).success).toBe(true);
    }
  });

  it("maps every Conceitual status to a valid StatusVistoria", () => {
    for (const target of Object.values(CONCEITUAL_TO_STATUS)) {
      expect(StatusVistoriaSchema.safeParse(target).success).toBe(true);
    }
  });
});

describe("webhook schemas", () => {
  it("parses a valid Rede Vistorias payload", () => {
    const result = RedeVistoriasWebhookSchema.safeParse({
      event: "inspection.updated",
      inspectionId: "INS-001",
      status: "SCHEDULED",
      occurredAt: "2026-04-26T10:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects Rede Vistorias payload with unknown event", () => {
    const result = RedeVistoriasWebhookSchema.safeParse({
      event: "unknown.event",
      inspectionId: "INS-001",
      status: "SCHEDULED",
      occurredAt: "2026-04-26T10:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("parses a valid Conceitual payload", () => {
    const result = ConceitualWebhookSchema.safeParse({
      evento: "vistoria.atualizada",
      idVistoria: "VIS-001",
      situacao: "AGENDADA",
      ocorrenciaEm: "2026-04-26T10:00:00Z",
    });
    expect(result.success).toBe(true);
  });
});
