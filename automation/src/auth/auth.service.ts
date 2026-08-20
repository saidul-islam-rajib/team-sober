import { Injectable, Logger } from '@nestjs/common';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

@Injectable()
export class AuthService {
  static readonly COOKIE = 'blog_session';

  private readonly logger = new Logger(AuthService.name);
  private readonly password = process.env.ADMIN_PASSWORD ?? '';
  private readonly secret =
    process.env.SESSION_SECRET ?? randomBytes(32).toString('hex');
  private readonly maxAgeMs = 1000 * 60 * 60 * 12;

  constructor() {
    if (!this.password) {
      this.logger.warn(
        'ADMIN_PASSWORD is not set — the admin area is locked and cannot be signed into.',
      );
    }
  }

  get configured(): boolean {
    return this.password.length > 0;
  }

  verifyPassword(candidate: string): boolean {
    if (!this.configured || !candidate) return false;

    const a = createHash('sha256').update(candidate).digest();
    const b = createHash('sha256').update(this.password).digest();

    return timingSafeEqual(a, b);
  }

  issueToken(): string {
    const expiry = Date.now() + this.maxAgeMs;
    return `${expiry}.${this.sign(String(expiry))}`;
  }

  verifyToken(token?: string): boolean {
    if (!token) return false;

    const [expiry, signature] = token.split('.');
    if (!expiry || !signature) return false;

    const expected = this.sign(expiry);
    if (signature.length !== expected.length) return false;

    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return false;
    }

    return Number(expiry) > Date.now();
  }

  get cookieMaxAge(): number {
    return this.maxAgeMs;
  }

  private sign(value: string): string {
    return createHmac('sha256', this.secret).update(value).digest('hex');
  }
}
