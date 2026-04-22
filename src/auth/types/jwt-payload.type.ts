import { Role } from '@/generated/prisma/enums';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload extends JwtPayload {
  tokenId: string;
}
