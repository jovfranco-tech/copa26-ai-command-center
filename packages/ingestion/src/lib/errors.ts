/** Thrown to halt a run immediately (block, login wall, robots disallow, etc.). */
export class StopError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StopError';
  }
}
