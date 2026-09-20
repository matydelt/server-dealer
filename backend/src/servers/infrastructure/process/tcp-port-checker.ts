import { Injectable } from '@nestjs/common';
import * as net from 'net';
import { PortChecker } from '../../domain/ports/port-checker.port';

/** Probes a port by trying to bind it: if binding fails, something else holds it. */
@Injectable()
export class TcpPortChecker implements PortChecker {
  isInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();

      server.once('error', () => resolve(true));
      server.once('listening', () => {
        server.close();
        resolve(false);
      });

      server.listen(port);
    });
  }
}
