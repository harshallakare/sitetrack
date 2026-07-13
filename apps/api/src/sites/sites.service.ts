import { ForbiddenException, Injectable } from "@nestjs/common";
import type { CreateSiteInput, UpdateSiteInput } from "@sitetrack/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { PlansService } from "../billing/plans.service";

@Injectable()
export class SitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plansService: PlansService
  ) {}

  list() {
    return this.prisma.db.site.findMany({ orderBy: { createdAt: "desc" } });
  }

  get(id: string) {
    return this.prisma.db.site.findUnique({ where: { id } });
  }

  async create(dto: CreateSiteInput) {
    const organizationId = this.prisma.organizationId;
    // Enforce the plan's site limit ("one project free, pay for more").
    // Count + create happen inside ONE transaction so two concurrent creates
    // can't both pass the limit check (the TOCTOU the plain
    // assertCanCreateSite pre-check had). SQLite serializes writers; on
    // Postgres/MySQL the window shrinks to the transaction rather than the
    // whole request.
    const plan = await this.plansService.planForOrganization(organizationId);
    return this.prisma.db.$transaction(async (tx) => {
      if (plan.maxSites !== -1) {
        const siteCount = await tx.site.count();
        if (siteCount >= plan.maxSites) {
          throw new ForbiddenException(
            `Your ${plan.name} plan allows ${plan.maxSites} site${plan.maxSites === 1 ? "" : "s"}. Upgrade to add more.`
          );
        }
      }
      return tx.site.create({ data: { ...dto, organizationId } });
    });
  }

  update(id: string, dto: UpdateSiteInput) {
    return this.prisma.db.site.update({ where: { id }, data: dto });
  }
}
