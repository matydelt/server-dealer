import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  
  app.useGlobalPipes(new ValidationPipe());
  app.setGlobalPrefix('api');
  
  await app.listen(3000);
  console.log('Server is running on http://localhost:3000/api');
  console.log('Frontend is available at http://localhost:3000');
}
bootstrap();
