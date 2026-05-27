import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { Logger as PinoNestLogger, PinoLogger } from "nestjs-pino";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import compression from "compression";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { TypedConfigService } from "./config/typed-config.service";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(PinoNestLogger));

  app.use(helmet());
  app.use(compression());

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
  app.setGlobalPrefix("api", { exclude: ["health", "metrics"] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter(await app.resolve(PinoLogger)));

  const config = app.get(TypedConfigService);
  if (config.get("NODE_ENV") !== "production") {
    const swagger = new DocumentBuilder()
      .setTitle("Vistoria Platform API")
      .setDescription("Backend NestJS — Auxiliadora Predial")
      .setVersion("0.1")
      .addBearerAuth()
      .build();
    const doc = SwaggerModule.createDocument(app, swagger);
    SwaggerModule.setup("api/docs", app, doc, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  app.enableShutdownHooks();

  const port = config.get("PORT");
  await app.listen(port);
}

void bootstrap();
