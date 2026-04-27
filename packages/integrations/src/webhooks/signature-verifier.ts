import { createHmac, timingSafeEqual } from "node:crypto";
import { Injectable } from "@nestjs/common";

/**
 * Verifica assinaturas de webhook (HMAC-SHA256) com comparação timing-safe.
 *
 * Cada parceiro tem seu próprio segredo e header de assinatura:
 * - Rede Vistorias: `x-rv-signature` (hex)
 * - Conceitual: `x-conceitual-signature` (hex)
 *
 * O `rawBody` é o corpo da requisição em bytes ANTES de qualquer parsing JSON,
 * já que o JSON.stringify do Node nem sempre preserva ordem/whitespace do remetente.
 */
@Injectable()
export class WebhookSignatureVerifier {
  /**
   * @returns true se a assinatura confere; false se difere ou se o formato é inválido.
   */
  verify(
    rawBody: string | Buffer,
    signatureHex: string,
    secret: string,
  ): boolean {
    if (!signatureHex || !secret) {
      return false;
    }
    const computedHex = createHmac("sha256", secret)
      .update(
        typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody,
      )
      .digest("hex");
    const a = Buffer.from(computedHex, "hex");
    let b: Buffer;
    try {
      b = Buffer.from(signatureHex, "hex");
    } catch {
      return false;
    }
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(a, b);
  }
}
