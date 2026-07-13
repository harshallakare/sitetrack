import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/** Verifies the admin-domain JWT only (the "admin-jwt" passport strategy). Never accepts a tenant access token. */
@Injectable()
export class AdminJwtAuthGuard extends AuthGuard("admin-jwt") {}
