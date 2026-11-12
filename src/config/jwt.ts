import * as jwt from 'jsonwebtoken';

export interface JWTPayload {
  userId: string;
  email: string;
  roles: string[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class JWTService {
  private static readonly ACCESS_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private static readonly REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
  private static readonly ACCESS_EXPIRATION = process.env.JWT_ACCESS_EXPIRATION || '15m';
  private static readonly REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION || '7d';

  static generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(
      { userId: payload.userId, email: payload.email, roles: payload.roles },
      this.ACCESS_SECRET,
      { expiresIn: this.ACCESS_EXPIRATION } as any
    );
  }

  static generateRefreshToken(payload: JWTPayload): string {
    return jwt.sign(
      { userId: payload.userId, email: payload.email, roles: payload.roles },
      this.REFRESH_SECRET,
      { expiresIn: this.REFRESH_EXPIRATION } as any
    );
  }

  static generateTokenPair(payload: JWTPayload): TokenPair {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }

  static verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.ACCESS_SECRET) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  static verifyRefreshToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.REFRESH_SECRET) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }
}
