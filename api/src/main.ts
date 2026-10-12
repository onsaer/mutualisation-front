import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

/** Configuration commune à l'application et aux tests e2e. */
export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api');
  // En développement, le front passe par le proxy d'`ng serve` ; CORS sert aux autres origines.
  app.enableCors({ origin: process.env['CORS_ORIGIN']?.split(',') ?? ['http://localhost:4200'] });
  app.enableShutdownHooks();
  return app;
}

if (process.env['VITEST'] === undefined) {
  const app = configureApp(await NestFactory.create(AppModule));
  await app.listen(process.env['PORT'] ?? 3000);
  console.log(`API prête sur ${await app.getUrl()}/api`);
}
