import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ForbiddenException } from "@nestjs/common";
import { WebhookController } from "./webhook.controller";
import { WebhookSignatureVerifier } from "./signature-verifier";
import { RedeVistoriasProvider } from "../providers/rede-vistorias.provider";
import { ConceitualProvider } from "../providers/conceitual.provider";
import {
  VISTORIA_STATUS_WRITER,
  type VistoriaStatusWriterPort,
} from "../ports/vistoria-status-writer.port";

const VALID_RV_BODY = {
  event: "inspection.updated" as const,
  inspectionId: "rv-100",
  externalId: "vistoria-internal-1",
  status: "CONFIRMED" as const,
  occurredAt: "2026-05-19T10:00:00.000Z",
};

describe("WebhookController.receive (rede-vistorias)", () => {
  let controller: WebhookController;
  let verifier: WebhookSignatureVerifier;
  let writer: jest.Mocked<VistoriaStatusWriterPort>;

  beforeEach(async () => {
    const verifierMock = { verify: jest.fn().mockReturnValue(true) };
    writer = { update: jest.fn().mockResolvedValue(undefined) };
    const moduleRef = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        { provide: WebhookSignatureVerifier, useValue: verifierMock },
        {
          provide: RedeVistoriasProvider,
          useValue: { receberWebhook: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: ConceitualProvider,
          useValue: { receberWebhook: jest.fn().mockResolvedValue(undefined) },
        },
        { provide: ConfigService, useValue: { get: () => "secret-stub" } },
        { provide: VISTORIA_STATUS_WRITER, useValue: writer },
      ],
    }).compile();
    controller = moduleRef.get(WebhookController);
    verifier = moduleRef.get(WebhookSignatureVerifier);
  });

  function req(rawBody?: Buffer): {
    rawBody?: Buffer;
  } {
    return { rawBody };
  }

  it("mapeia status do parceiro e chama statusWriter", async () => {
    await controller.receive(
      "rede-vistorias",
      VALID_RV_BODY,
      {
        "x-rv-signature": "sig",
        "x-tenant-id": "t-1",
        "x-correlation-id": "corr-abc",
      },
      req() as never,
    );
    expect(writer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        vistoriaId: "vistoria-internal-1",
        tenantId: "t-1",
        newStatus: "CONFIRMADA",
        source: "rede-vistorias",
        correlationId: "corr-abc",
      }),
    );
  });

  it("rejeita com 403 quando HMAC inválido", async () => {
    (verifier.verify as jest.Mock).mockReturnValueOnce(false);
    await expect(
      controller.receive(
        "rede-vistorias",
        VALID_RV_BODY,
        { "x-rv-signature": "wrong" },
        req() as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(writer.update).not.toHaveBeenCalled();
  });

  it("não chama statusWriter quando webhook não tem externalId", async () => {
    const { externalId: _omit, ...without } = VALID_RV_BODY;
    void _omit;
    await controller.receive(
      "rede-vistorias",
      without,
      { "x-rv-signature": "sig" },
      req() as never,
    );
    expect(writer.update).not.toHaveBeenCalled();
  });
});
