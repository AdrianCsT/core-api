import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import { Response } from 'express';
import ms from 'ms';
import type { StringValue } from 'ms';

import { Role, TokenType } from '@/generated/prisma/enums';
import { PrismaService } from '@/prisma';
import { JwtPayload, JwtRefreshPayload } from '../types/jwt-payload.type';

export interface AuthTokens {
  access_token: string;
}

const REFRESH_COOKIE_NAME = 'refresh_token';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class TokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async issueTokenPair(
    userId: string,
    email: string,
    role: Role,
    res: Response,
  ): Promise<AuthTokens> {
    const accessPayload: JwtPayload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
      expiresIn: this.configService.get<string>('jwt.accessExpiresIn', '15m') as StringValue,
    });

    const refreshToken = randomUUID();
    const refreshExpiresIn = this.configService.get<string>(
      'jwt.refreshExpiresIn',
      '30d',
    ) as StringValue;

    const expiresAt = this.parseExpiry(refreshExpiresIn);
    const cookieMaxAge = ms(refreshExpiresIn);

    // Persist SHA-256 hash of the refresh token
    await this.prisma.token.create({
      data: {
        token: hashToken(refreshToken),
        type: TokenType.REFRESH,
        userId,
        expiresAt,
      },
    });

    // Create a signed JWT that carries the tokenId for refresh strategy validation
    const refreshJwt = this.jwtService.sign(
      { sub: userId, email, role, tokenId: refreshToken } as JwtRefreshPayload,
      {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: refreshExpiresIn,
      },
    );

    this.setRefreshCookie(res, refreshJwt, cookieMaxAge);

    return { access_token: accessToken };
  }

  setRefreshCookie(res: Response, token: string, maxAge: number): void {
    const isProd = this.configService.get<string>('app.nodeEnv') === 'production';

    res.cookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge,
    });
  }

  clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE_NAME, {
      path: '/',
    });
  }

  parseExpiry(expiry: string): Date {
    return new Date(Date.now() + ms(expiry as StringValue));
  }
}
