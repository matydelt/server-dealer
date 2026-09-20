import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { bearerToken } from '../../../shared/infrastructure/http/bearer-token';
import { AuthenticateTokenUseCase } from '../../../users/application/use-cases/authenticate-token.use-case';
import { AuthenticatedUser } from '../../../users/domain/entities/user';

declare module 'express' {
  interface Request {
    user?: AuthenticatedUser;
  }
}

/** Requires any valid token. */
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly authenticateToken: AuthenticateTokenUseCase) {}

  use(req: Request, _res: Response, next: NextFunction) {
    const user = this.authenticateToken.execute(bearerToken(req));

    if (!user) {
      throw new ForbiddenException('Invalid token');
    }

    req.user = user;
    next();
  }
}

/** Requires the admin token. */
@Injectable()
export class AdminMiddleware implements NestMiddleware {
  constructor(private readonly authenticateToken: AuthenticateTokenUseCase) {}

  use(req: Request, _res: Response, next: NextFunction) {
    const user = this.authenticateToken.execute(bearerToken(req));

    if (!user?.isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    req.user = user;
    next();
  }
}
