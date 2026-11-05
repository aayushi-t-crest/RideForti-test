import { describe, expect, it } from "vitest";
import { emailWaitlistRegistration } from "@/lib/publicSms";

describe("public waitlist SMS restrictions", () => {
  it("does not submit a phone number", () => {
    expect(emailWaitlistRegistration(" Rider ", " RIDER@EXAMPLE.COM ").phone).toBeNull();
  });
  it("does not grant informational SMS consent", () => {
    expect(emailWaitlistRegistration("Rider", "rider@example.com").agreed_to_sms).toBe(false);
  });
  it("does not grant marketing SMS consent", () => {
    expect(emailWaitlistRegistration("Rider", "rider@example.com").agreed_to_marketing).toBe(false);
  });
});