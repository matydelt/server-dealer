import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private usersPath = path.join(process.cwd(), 'data', 'users.json');

  use(req: Request, res: Response, next: NextFunction) {
    const token = req.headers['authorization']?.replace('Bearer ', '');

    if (!token) {
      throw new ForbiddenException('No token provided');
    }

    try {
      const data = fs.readFileSync(this.usersPath, 'utf-8');
      const usersData = JSON.parse(data);
      
      // Check if it's the admin token
      if (token === usersData.adminToken) {
        req['user'] = { name: 'admin', isAdmin: true };
        return next();
      }

      // Check if it's a regular user token
      const user = usersData.users.find((u: any) => u.token === token);
      if (user) {
        req['user'] = { name: user.name, isAdmin: false };
        return next();
      }

      throw new ForbiddenException('Invalid token');
    } catch (error) {
      throw new ForbiddenException('Invalid token');
    }
  }
}

@Injectable()
export class AdminMiddleware implements NestMiddleware {
  private usersPath = path.join(process.cwd(), 'data', 'users.json');

  use(req: Request, res: Response, next: NextFunction) {
    const token = req.headers['authorization']?.replace('Bearer ', '');

    if (!token) {
      throw new ForbiddenException('No token provided');
    }

    try {
      const data = fs.readFileSync(this.usersPath, 'utf-8');
      const usersData = JSON.parse(data);
      
      // Only allow admin token
      if (token !== usersData.adminToken) {
        throw new ForbiddenException('Admin access required');
      }

      req['user'] = { name: 'admin', isAdmin: true };
      next();
    } catch (error) {
      throw new ForbiddenException('Admin access required');
    }
  }
}
