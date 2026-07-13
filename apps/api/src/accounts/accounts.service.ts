import { Injectable } from "@nestjs/common";
import { toMinorUnits } from "@sitetrack/shared-types";
import type { CreateAccountInput, UpdateAccountInput } from "@sitetrack/shared-types";
import { writeAuditLog } from "../common/audit/write-audit-log";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.db.account.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
  }

  get(id: string) {
    return this.prisma.db.account.findUnique({ where: { id } });
  }

  async create(dto: CreateAccountInput, actorUserId: string) {
    const organizationId = this.prisma.organizationId;
    const openingBalanceMinor = toMinorUnits(dto.openingBalance ?? 0);

    const account = await this.prisma.db.account.create({
      data: {
        organizationId,
        name: dto.name,
        type: dto.type,
        siteId: dto.siteId,
        description: dto.description,
        openingBalanceMinor,
        currentBalanceMinor: openingBalanceMinor,
      },
    });

    await writeAuditLog(this.prisma.db, {
      organizationId,
      entityType: "Account",
      entityId: account.id,
      action: "CREATE",
      actorUserId,
      after: account,
    });

    return account;
  }

  async update(id: string, dto: UpdateAccountInput, actorUserId: string) {
    const before = await this.prisma.db.account.findUnique({ where: { id } });
    const { openingBalance, ...rest } = dto;

    const account = await this.prisma.db.account.update({
      where: { id },
      data: {
        ...rest,
        ...(openingBalance !== undefined ? { openingBalanceMinor: toMinorUnits(openingBalance) } : {}),
      },
    });

    await writeAuditLog(this.prisma.db, {
      organizationId: this.prisma.organizationId,
      entityType: "Account",
      entityId: id,
      action: "UPDATE",
      actorUserId,
      before,
      after: account,
    });

    return account;
  }
}
