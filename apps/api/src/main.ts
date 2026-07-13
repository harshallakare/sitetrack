import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { AppModule } from "./app.module";

// Note: this app validates request bodies with per-route zod schemas
// (ZodValidationPipe) shared with the frontend via @sitetrack/shared-types,
// not class-validator decorated DTOs, so there is no global ValidationPipe
// here -- registering Nest's class-validator ValidationPipe globally without
// any class-validator-decorated DTOs would silently strip request bodies
// down to {} whenever `whitelist: true` is set.
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: true });

  // Standard security headers, incl. X-Content-Type-Options: nosniff (matters
  // for the attachment download route, which serves user-uploaded content).
  // CSP is disabled because this API serves JSON + file streams, not HTML
  // pages; the Next.js app owns its own page-level policy.
  app.use(helmet({ contentSecurityPolicy: false }));

  // Behind a reverse proxy (nginx/Caddy/hosted), req.ip must come from
  // X-Forwarded-For or the rate limiter would throttle the proxy itself.
  app.set("trust proxy", 1);

  app.enableCors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  });

  const port = Number(process.env.API_PORT) || 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[api] listening on http://localhost:${port}`);
}

bootstrap();
