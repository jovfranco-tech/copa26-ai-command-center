/** robots.txt gate. The runner refuses any path robots.txt disallows. */
import robotsParser from 'robots-parser';
import type { Logger } from './logger.js';

type Robots = ReturnType<typeof robotsParser>;

export class RobotsChecker {
  private cache = new Map<string, Robots>();

  constructor(
    private ua: string,
    private log: Logger,
  ) {}

  private async load(origin: string): Promise<Robots> {
    const cached = this.cache.get(origin);
    if (cached) return cached;
    const robotsUrl = `${origin}/robots.txt`;
    let txt = '';
    try {
      const res = await fetch(robotsUrl, { headers: { 'user-agent': this.ua } });
      if (res.ok) txt = await res.text();
      else this.log.warn(`robots.txt returned ${res.status} for ${origin} (treating as allow-all)`);
    } catch (err) {
      this.log.warn(`could not fetch ${robotsUrl}: ${(err as Error).message} (treating as allow-all)`);
    }
    const rp = robotsParser(robotsUrl, txt);
    this.cache.set(origin, rp);
    return rp;
  }

  /** True only if robots.txt does not disallow the path for our UA. */
  async allowed(url: string): Promise<boolean> {
    let origin: string;
    try {
      origin = new URL(url).origin;
    } catch {
      return false;
    }
    const rp = await this.load(origin);
    return rp.isAllowed(url, this.ua) !== false;
  }
}
