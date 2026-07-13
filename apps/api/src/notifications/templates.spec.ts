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
});
