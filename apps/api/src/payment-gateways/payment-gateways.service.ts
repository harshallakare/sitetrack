import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  PAYMENT_PROVIDER_REGISTRY,
  type PaymentProvider,
  type UpsertPaymentGatewayInput,
} from "@sitetrack/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { SecretCryptoService } from "../common/crypto/secret-crypto.service";

@Injectable()
export class PaymentGatewaysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: SecretCryptoService
  ) {}

  /** The pluggable provider catalog, so the admin UI is generated from it. */
  registry() {
    return Object.values(PAYMENT_PROVIDER_REGISTRY);
  }

  async list() {
    const rows = await this.prisma.unscoped.paymentGatewayConfig.findMany({ orderBy: { provider: "asc" } });
    return rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      mode: row.mode,
      keyId: row.keyId,
      keySecretMasked: this.crypto.mask(row.keySecretEnc),
      webhookSecretMasked: this.crypto.mask(row.webhookSecretEnc),
      isActive: row.isActive,
      updatedAt: row.updatedAt,
    }));
  }

  async upsert(input: UpsertPaymentGatewayInput) {
    if (!(input.provider in PAYMENT_PROVIDER_REGISTRY)) {
      throw new BadRequestException("Unknown payment provider");
    }

    const existing = await this.prisma.unscoped.paymentGatewayConfig.findUnique({
      where: { provider: input.provider },
    });

    // Secret required on first setup; on edit it may be omitted to keep the
    // stored one.
    if (!existing && !input.keySecret) {
      throw new BadRequestException("Secret key is required when configuring a gateway for the first time");
    }

    const data = {
      mode: input.mode,
      keyId: input.keyId,
      ...(input.keySecret ? { keySecretEnc: this.crypto.encrypt(input.keySecret) } : {}),
      ...(input.webhookSecret ? { webhookSecretEnc: this.crypto.encrypt(input.webhookSecret) } : {}),
    };

    if (existing) {
      await this.prisma.unscoped.paymentGatewayConfig.update({ where: { provider: input.provider }, data });
    } else {
      await this.prisma.unscoped.paymentGatewayConfig.create({
        data: { provider: input.provider, ...data, keySecretEnc: this.crypto.encrypt(input.keySecret as string) },
      });
    }

    return this.list();
  }

  async setActive(provider: PaymentProvider, isActive: boolean) {
    const existing = await this.prisma.unscoped.paymentGatewayConfig.findUnique({ where: { provider } });
    if (!existing) throw new NotFoundException("That gateway is not configured yet");

    // At most one active gateway: activating one deactivates the rest, in a
    // single transaction so there's never a window with two active.
    await this.prisma.unscoped.$transaction(async (tx) => {
      if (isActive) {
        await tx.paymentGatewayConfig.updateMany({
          where: { provider: { not: provider } },
          data: { isActive: false },
        });
      }
      await tx.paymentGatewayConfig.update({ where: { provider }, data: { isActive } });
    });

    return this.list();
  }
}
