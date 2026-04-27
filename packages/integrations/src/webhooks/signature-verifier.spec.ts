import { createHmac } from "node:crypto";
import { WebhookSignatureVerifier } from "./signature-verifier";

describe("WebhookSignatureVerifier", () => {
  const verifier = new WebhookSignatureVerifier();
  const secret = "super-secret-shared-with-partner";
  const body = JSON.stringify({ inspectionId: "INS-1", status: "SCHEDULED" });
  const validSig = createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("hex");

  it("accepts a valid HMAC-SHA256 signature", () => {
    expect(verifier.verify(body, validSig, secret)).toBe(true);
  });

  it("rejects a wrong signature", () => {
    const wrong = "a".repeat(validSig.length);
    expect(verifier.verify(body, wrong, secret)).toBe(false);
  });

  it("rejects when the body has been tampered", () => {
    const tampered = body.replace("INS-1", "INS-2");
    expect(verifier.verify(tampered, validSig, secret)).toBe(false);
  });

  it("rejects when secret is empty", () => {
    expect(verifier.verify(body, validSig, "")).toBe(false);
  });

  it("rejects when signature is empty", () => {
    expect(verifier.verify(body, "", secret)).toBe(false);
  });

  it("rejects when signature is not hex", () => {
    expect(verifier.verify(body, "not-hex-zzzz!!", secret)).toBe(false);
  });

  it("rejects when signatures have different lengths", () => {
    expect(verifier.verify(body, validSig.slice(0, 10), secret)).toBe(false);
  });

  it("accepts a Buffer body identical to string body", () => {
    expect(verifier.verify(Buffer.from(body, "utf8"), validSig, secret)).toBe(
      true,
    );
  });
});
