import type { RenderedMessage } from "./drivers/types";

/**
 * Notification template registry. Each template renders subject + text (+ html
 * for email) from typed data. Kept tiny and dependency-free; swap for a real
 * templating engine later if richer emails are needed.
 */
export type NotificationTemplate =
  | { name: "test"; data: { message: string } }
  | { name: "password_reset"; data: { name: string; resetUrl: string } }
  | { name: "org_invite"; data: { organizationName: string; role: string; inviteUrl: string } };

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
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
