import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { AuthMiddleware, AdminMiddleware } from './auth.middleware';

@Module({})
export class AuthModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: 'servers', method: RequestMethod.GET },
        { path: 'servers/running', method: RequestMethod.GET },
        { path: 'servers/:name/status', method: RequestMethod.GET },
        { path: 'servers/:name/logs', method: RequestMethod.GET },
        { path: 'servers/start', method: RequestMethod.POST },
        { path: 'servers/stop/:name', method: RequestMethod.POST },
        { path: 'servers/restart/:name', method: RequestMethod.POST },
        { path: 'users/me', method: RequestMethod.GET },
      )
      .apply(AdminMiddleware)
      .forRoutes(
        { path: 'servers', method: RequestMethod.POST },
        { path: 'servers/:name', method: RequestMethod.PUT },
        { path: 'servers/:name', method: RequestMethod.DELETE },
        { path: 'users', method: RequestMethod.GET },
        { path: 'users', method: RequestMethod.POST },
        { path: 'users/:name', method: RequestMethod.DELETE },
      );
  }
}
