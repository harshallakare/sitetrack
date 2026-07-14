import { formatMoney } from "@sitetrack/shared-types";
import type { RenderedMessage } from "./drivers/types";

/**
 * Notification template registry. Each template renders subject + text (+ html
 * for email) from typed data. Kept tiny and dependency-free; swap for a real
 * templating engine later if richer emails are needed.
 */
export type NotificationTemplate =
  | { name: "test"; data: { message: string } }
  | { name: "password_reset"; data: { name: string; resetUrl: string } }
  | { name: "org_invite"; data: { organizationName: string; role: string; inviteUrl: string } }
  | {
      name: "budget_exceeded";
      data: { organizationName: string; siteName: string; category: string; plannedMinor: number; actualMinor: number };
    }
  | {
      name: "weekly_digest";
      data: {
        organizationName: string;
        deliveriesCount: number;
        spendMinor: number;
        outstandingPayablesMinor: number;
        sitesOverBudget: string[];
      };
    };

export type TemplateName = NotificationTemplate["name"];

export function renderTemplate(template: NotificationTemplate): RenderedMessage {
  switch (template.name) {
    case "test":
      return {
        subject: "SiteTrack test notification",
        text: template.data.message,
        html: `<p>${escapeHtml(template.data.message)}</p>`,
      };
    case "password_reset":
      return {
        subject: "Reset your SiteTrack password",
        text: `Hi ${template.data.name},\n\nReset your password using this link (valid 1 hour):\n${template.data.resetUrl}\n\nIf you didn't request this, ignore this email.`,
        html: `<p>Hi ${escapeHtml(template.data.name)},</p><p>Reset your password using this link (valid 1 hour):</p><p><a href="${template.data.resetUrl}">Reset password</a></p><p>If you didn't request this, you can ignore this email.</p>`,
      };
    case "org_invite":
      return {
        subject: `You've been invited to ${template.data.organizationName} on SiteTrack`,
        text: `You've been invited to join ${template.data.organizationName} as ${template.data.role}.\n\nAccept here:\n${template.data.inviteUrl}`,
        html: `<p>You've been invited to join <strong>${escapeHtml(template.data.organizationName)}</strong> as ${escapeHtml(template.data.role)}.</p><p><a href="${template.data.inviteUrl}">Accept invitation</a></p>`,
      };
    case "budget_exceeded": {
      const { organizationName, siteName, category, plannedMinor, actualMinor } = template.data;
      const planned = formatMoney(plannedMinor);
      const actual = formatMoney(actualMinor);
      return {
        subject: `Budget exceeded: ${category} at ${siteName}`,
        text: `${organizationName} — ${siteName}\n\nSpend on "${category}" has crossed its budget: ${actual} spent against a planned ${planned}.\n\nReview the Budget tab on this site for details.`,
        html: `<p><strong>${escapeHtml(organizationName)}</strong> — ${escapeHtml(siteName)}</p><p>Spend on <strong>${escapeHtml(category)}</strong> has crossed its budget: <strong>${actual}</strong> spent against a planned ${planned}.</p><p>Review the Budget tab on this site for details.</p>`,
      };
    }
    case "weekly_digest": {
      const { organizationName, deliveriesCount, spendMinor, outstandingPayablesMinor, sitesOverBudget } = template.data;
      const spend = formatMoney(spendMinor);
      const payables = formatMoney(outstandingPayablesMinor);
      const overBudgetLine = sitesOverBudget.length
        ? `Sites over budget: ${sitesOverBudget.join(", ")}.`
        : "No sites are over budget.";
      return {
        subject: `Weekly summary: ${organizationName}`,
        text: `${organizationName} — last 7 days\n\nDeliveries recorded: ${deliveriesCount}\nSpend: ${spend}\nOutstanding vendor balances: ${payables}\n${overBudgetLine}`,
        html: `<p><strong>${escapeHtml(organizationName)}</strong> — last 7 days</p><ul><li>Deliveries recorded: ${deliveriesCount}</li><li>Spend: ${spend}</li><li>Outstanding vendor balances: ${payables}</li></ul><p>${escapeHtml(overBudgetLine)}</p>`,
      };
    }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
