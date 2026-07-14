import { BadRequestException, Controller, Headers, Post, Req, type RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { Public } from "../common/decorators/public.decorator";
import { PlansService } from "../billing/plans.service";
import { RazorpayService } from "../billing/razorpay.service";

/**
 * Inbound gateway webhooks -- unauthenticated by nature (Razorpay calls
 * this, not a logged-in user), so this lives outside the normal /billing
 * prefix and is reachable directly through Caddy (see ../../Caddyfile),
 * bypassing the Next.js proxy entirely. Authenticity comes from the
 * signature check below, not from a session.
 */
@Public()
@Controller("webhooks")
export class WebhooksController {
  constructor(
    private readonly plansService: PlansService,
    private readonly razorpay: RazorpayService
  ) {}

  @Post("razorpay")
  async handleRazorpayWebhook(@Req() req: RawBodyRequest<Request>, @Headers("x-razorpay-signature") signature?: string) {
    if (!signature) throw new BadRequestException("Missing X-Razorpay-Signature header");
    if (!req.rawBody) throw new BadRequestException("Missing request body");

    const creds = await this.razorpay.activeCredentials();
    if (!creds.webhookSecret) {
      throw new BadRequestException("Webhook secret is not configured for the active gateway");
    }

    const validSignature = this.razorpay.verifyWebhookSignature(req.rawBody, signature, creds.webhookSecret);
    if (!validSignature) throw new BadRequestException("Invalid webhook signature");

    const event = JSON.parse(req.rawBody.toString("utf8"));
    await this.plansService.handleRazorpayWebhookEvent(event);

    // Razorpay only cares that this returns 2xx quickly; the body is ignored.
    return { received: true };
  }
}
