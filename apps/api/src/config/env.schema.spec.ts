import { validateEnv } from "./env.schema";

const baseEnv = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379",
  RABBITMQ_URL: "amqp://u:p@localhost:5672",
  SMTP_HOST: "localhost",
  SMTP_PORT: "1025",
};

describe("envSchema.validateEnv", () => {
  it("parses valid input with defaults", () => {
    const env = validateEnv(baseEnv);
    expect(env.NODE_ENV).toBe("development");
    expect(env.PORT).toBe(3000);
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.RABBITMQ_EXCHANGE).toBe("vistoria.events");
  });

  it("coerces numeric env vars from strings", () => {
    const env = validateEnv({ ...baseEnv, PORT: "8080", SMTP_PORT: "2525" });
    expect(env.PORT).toBe(8080);
    expect(env.SMTP_PORT).toBe(2525);
  });

  it("rejects invalid DATABASE_URL", () => {
    expect(() =>
      validateEnv({ ...baseEnv, DATABASE_URL: "not-a-url" }),
    ).toThrow(/Invalid environment variables/);
  });

  it("requires JWT keys in production", () => {
    expect(() => validateEnv({ ...baseEnv, NODE_ENV: "production" })).toThrow(
      /JWT_PRIVATE_KEY and JWT_PUBLIC_KEY are required in production/,
    );
  });

  it("accepts production when JWT keys are present", () => {
    const env = validateEnv({
      ...baseEnv,
      NODE_ENV: "production",
      JWT_PRIVATE_KEY: "priv",
      JWT_PUBLIC_KEY: "pub",
    });
    expect(env.NODE_ENV).toBe("production");
  });
});
