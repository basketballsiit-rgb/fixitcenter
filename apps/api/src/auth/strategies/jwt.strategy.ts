import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'fallback_secret'),
    });
  }

  async validate(payload: any) {
    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      roleId: payload.roleId,
      centerId: payload.centerId,
      permissions: payload.permissions || [],
    };
  }
}
