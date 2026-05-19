import { generateKeyPairSync } from "node:crypto";
import { Logger } from "@nestjs/common";

export interface RsaKeyPair {
  privateKey: string;
  publicKey: string;
  ephemeral: boolean;
}

const logger = new Logger("AuthKeys");

// Singleton process-wide. Sem isso, JwtModule (signer) e JwtStrategy
// (verifier) recebiam pares RSA diferentes em dev e a verificação
// quebrava todas as rotas autenticadas com 401.
let ephemeralCache: RsaKeyPair | null = null;

export function resolveRsaKeyPair(input: {
  privateKey: string;
  publicKey: string;
  isProduction: boolean;
}): RsaKeyPair {
  if (input.privateKey && input.publicKey) {
    return {
      privateKey: input.privateKey,
      publicKey: input.publicKey,
      ephemeral: false,
    };
  }
  if (input.isProduction) {
    throw new Error(
      "JWT_PRIVATE_KEY and JWT_PUBLIC_KEY are required in production",
    );
  }
  if (ephemeralCache) {
    return ephemeralCache;
  }
  logger.warn(
    "JWT keys not provided — generating an ephemeral RSA-2048 key pair (dev/test only). " +
      "Tokens issued by this instance will not be verifiable by other instances.",
  );
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  ephemeralCache = { privateKey, publicKey, ephemeral: true };
  return ephemeralCache;
}
