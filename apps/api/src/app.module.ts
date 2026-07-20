import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { ClsModule } from "nestjs-cls";
import { validateEnv } from "./config/env.validation";
import { HealthController } from "./health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { CryptoModule } from "./common/crypto/crypto.module";
import { AuthModule } from "./auth/auth.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { SitesModule } from "./sites/sites.module";
import { VendorsModule } from "./vendors/vendors.module";
import { ItemsModule } from "./items/items.module";
import { DeliveriesModule } from "./deliveries/deliveries.module";
import { AccountsModule } from "./accounts/accounts.module";
import { PaymentsModule } from "./payments/payments.module";
import { PlatformAdminModule } from "./platform-admin/platform-admin.module";
import { AdminAuthModule } from "./admin-auth/admin-auth.module";
import { MembersModule } from "./members/members.module";
import { NotificationSettingsModule } from "./notification-settings/notification-settings.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PaymentGatewaysModule } from "./payment-gateways/payment-gateways.module";
import { BudgetModule } from "./budget/budget.module";
import { ActivityModule } from "./activity/activity.module";
import { BillingModule } from "./billing/billing.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { TagsModule } from "./tags/tags.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { TenantContextGuard } from "./common/guards/tenant-context.guard";
import { RolesGuard } from "./common/guards/roles.guard";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    // Powers WeeklyDigestService's @Cron job -- in-process, no separate
    // worker (fine for the single api-instance deployment default).
    ScheduleModule.forRoot(),
    // Generous global ceiling; auth endpoints override with much tighter
    // per-route @Throttle() limits (brute-force / reset-email-bombing guard).
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 300 }]),
    PrismaModule,
    CryptoModule,
    AuthModule,
    OrganizationsModule,
    SitesModule,
    VendorsModule,
    ItemsModule,
    DeliveriesModule,
    AccountsModule,
    PaymentsModule,
    PlatformAdminModule,
    AdminAuthModule,
    MembersModule,
    NotificationSettingsModule,
    NotificationsModule,
    PaymentGatewaysModule,
    BudgetModule,
    ActivityModule,
    BillingModule,
    WebhooksModule,
    TagsModule,
    AnalyticsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Order matters: Throttler rejects floods before any auth work happens,
    // Jwt establishes request.user, TenantContext resolves fresh membership +
    // populates CLS, Roles reads the role TenantContext set.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantContextGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
