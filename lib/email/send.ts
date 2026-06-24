import { Resend } from "resend";
import { getEnv } from "@/lib/env";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function sendEmail({
  to,
  subject,
  text
}: {
  to: string;
  subject: string;
  text: string;
}) {
  if (!resend) {
    console.warn(`[email skipped] ${subject} -> ${to}: ${text}`);
    return;
  }

  await resend.emails.send({
    from: getEnv("RESEND_FROM_EMAIL") || "Golf Draw <noreply@example.com>",
    to,
    subject,
    text
  });
}
