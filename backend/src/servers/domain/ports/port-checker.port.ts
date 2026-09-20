export const PORT_CHECKER = Symbol('PortChecker');

/** Driven port: tells whether a TCP port is already taken. */
export interface PortChecker {
  isInUse(port: number): Promise<boolean>;
}
