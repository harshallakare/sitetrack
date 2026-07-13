import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import type { Response } from "express";
import { createReadStream } from "node:fs";
import { FileInterceptor } from "@nestjs/platform-express";
import { createDeliverySchema, type CreateDeliveryInput } from "@sitetrack/shared-types";
import { contentMatchesMimeType } from "../common/magic-bytes";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { TenantContext } from "../auth/types";
import { DeliveriesService } from "./deliveries.service";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10MB, matches SiteWise's own upload limit
const ALLOWED_ATTACHMENT_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

@Controller("deliveries")
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get()
  list(
    @Query("siteId") siteId?: string,
    @Query("search") search?: string,
    @Query("limit") limit?: string,
    @Query("skip") skip?: string
  ) {
    return this.deliveriesService.list({
      siteId,
      search,
      limit: limit ? Number(limit) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    const delivery = await this.deliveriesService.get(id);
    if (!delivery) throw new NotFoundException("Delivery not found");
    return delivery;
  }

  @Roles("OWNER", "SUPERVISOR")
  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() currentUser: TenantContext) {
    return this.deliveriesService.remove(id, currentUser.userId);
  }

  @Roles("OWNER", "SUPERVISOR")
  @Post()
  create(
    @CurrentUser() currentUser: TenantContext,
    @Body(new ZodValidationPipe(createDeliverySchema)) dto: CreateDeliveryInput
  ) {
    return this.deliveriesService.create(dto, currentUser.userId);
  }

  @Roles("OWNER", "SUPERVISOR")
  @Post(":id/attachments")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_ATTACHMENT_BYTES } }))
  addAttachment(
    @Param("id") id: string,
    @CurrentUser() currentUser: TenantContext,
    @UploadedFile() file?: Express.Multer.File
  ) {
    if (!file) throw new BadRequestException("No file uploaded");
    if (!ALLOWED_ATTACHMENT_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException("Only PDF, JPEG, PNG, or WEBP files are supported");
    }
    // Claimed type must match actual content -- mimetype alone is spoofable.
    if (!contentMatchesMimeType(file.buffer, file.mimetype)) {
      throw new BadRequestException("File content does not match its declared type");
    }
    return this.deliveriesService.addAttachment(id, file, currentUser.userId);
  }

  @Get("attachments/:attachmentId/download")
  async downloadAttachment(@Param("attachmentId") attachmentId: string, @Res() res: Response) {
    const { absolutePath, fileName, mimeType } = await this.deliveriesService.getAttachmentForDownload(attachmentId);
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${fileName.replace(/"/g, "")}"`);
    createReadStream(absolutePath).pipe(res);
  }
}
