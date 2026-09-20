import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ServersModule } from './servers/servers.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'frontend'),
      exclude: ['/api'],
    }),
    ServersModule,
    AuthModule,
    UsersModule,
  ],
})
export class AppModule {}
