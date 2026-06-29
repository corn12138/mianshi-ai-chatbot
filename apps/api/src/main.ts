import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:5173';

  app.enableCors({
    origin: webOrigin.split(',').map((origin) => origin.trim()),
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`AI Chatbot API listening on http://localhost:${port}`);
}

bootstrap();
