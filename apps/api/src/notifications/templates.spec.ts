import { renderTemplate } from "./templates";

describe("notification templates", () => {
  it("renders the password reset email with the reset link", () => {
    const msg = renderTemplate({
      name: "password_reset",
      data: { name: "Harshal", resetUrl: "https://app.example.com/reset-password?token=abc" },
    });
    expect(msg.subject).toMatch(/reset/i);
    expect(msg.text).toContain("https://app.example.com/reset-password?token=abc");
    expect(msg.html).toContain("Harshal");
  });

  it("renders the org invite with the invite link and role", () => {
    const msg = renderTemplate({
      name: "org_invite",
      data: { organizationName: "Acme", role: "SUPERVISOR", inviteUrl: "https://app.example.com/invite/tok" },
    });
    expect(msg.subject).toContain("Acme");
    expect(msg.text).toContain("SUPERVISOR");
    expect(msg.text).toContain("https://app.example.com/invite/tok");
  });

  it("escapes HTML in interpolated values", () => {
    const msg = renderTemplate({ name: "test", data: { message: "<script>alert(1)</script>" } });
    expect(msg.html).not.toContain("<script>");
    expect(msg.html).toContain("&lt;script&gt;");
  });

  it("renders the budget-exceeded alert with site, category, and both amounts", () => {
    const msg = renderTemplate({
      name: "budget_exceeded",
      data: { organizationName: "Acme", siteName: "Tower A", category: "Cement", plannedMinor: 10000000, actualMinor: 12000000 },
    });
    expect(msg.subject).toContain("Cement");
    expect(msg.subject).toContain("Tower A");
    expect(msg.text).toContain("Acme");
    expect(msg.text).toContain("₹1,20,000.00");
    expect(msg.text).toContain("₹1,00,000.00");
  });

  it("renders the weekly digest with counts, spend, payables, and over-budget sites", () => {
    const msg = renderTemplate({
      name: "weekly_digest",
      data: {
        organizationName: "Acme",
        deliveriesCount: 4,
        spendMinor: 500000,
        outstandingPayablesMinor: 250000,
        sitesOverBudget: ["Tower A", "Tower B"],
      },
    });
    expect(msg.subject).toContain("Acme");
    expect(msg.text).toContain("Deliveries recorded: 4");
    expect(msg.text).toContain("Tower A, Tower B");
  });

  it("says no sites are over budget when the list is empty", () => {
    const msg = renderTemplate({
      name: "weekly_digest",
      data: { organizationName: "Acme", deliveriesCount: 0, spendMinor: 0, outstandingPayablesMinor: 0, sitesOverBudget: [] },
    });
    expect(msg.text).toContain("No sites are over budget");
  });
});
