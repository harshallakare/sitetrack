import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { AdminTokenPayload } from "../types";

/**
 * Named "admin-jwt" so it's a wholly separate passport strategy from the
 * tenant "jwt" strategy, signed with a different secret (JWT_ADMIN_SECRET).
 * A tenant access token can never pass this strategy's signature check, and
 * vice versa -- the two credential domains share no verification material.
 */
@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, "admin-jwt") {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_ADMIN_SECRET"),
    });
  }

  validate(payload: AdminTokenPayload): AdminTokenPayload {
    return payload;
  }
}
