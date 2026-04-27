import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),

  DATABASE_URL: z.string().url(),

  REDIS_URL: z.string().url(),

  RABBITMQ_URL: z.string().url(),
  RABBITMQ_EXCHANGE: z.string().min(1).default("vistoria.events"),

  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),

  JWT_PRIVATE_KEY: z.string().default(""),
  JWT_PUBLIC_KEY: z.string().default(""),
  JWT_ISSUER: z.string().min(1).default("vistoria-platform"),
  JWT_AUDIENCE: z.string().min(1).default("vistoria-api"),
  JWT_EXPIRES_IN: z.string().min(1).default("15m"),

  SERVICE_NAME: z.string().min(1).default("vistoria-api"),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  if (parsed.data.NODE_ENV === "production") {
    if (!parsed.data.JWT_PRIVATE_KEY || !parsed.data.JWT_PUBLIC_KEY) {
      throw new Error(
        "JWT_PRIVATE_KEY and JWT_PUBLIC_KEY are required in production",
      );
    }
  }
  return parsed.data;
}
