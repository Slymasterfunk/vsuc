import { NextRequest } from "next/server";
import { Resend } from "resend";
import { contactSchema, isExcludedState, EXCLUDED_STATES } from "./schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

async function verifyTurnstile(secret: string, token: string, ip: string | null): Promise<boolean> {
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.append("remoteip", ip);
  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, { method: "POST", body });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

function escapeHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return Response.json(
      { ok: false, error: "Please fix the highlighted fields", fieldErrors },
      { status: 400 },
    );
  }
  const data = parsed.data;

  if (data.website && data.website.length > 0) {
    return Response.json({ ok: true }, { status: 200 });
  }

  if (isExcludedState(data.state)) {
    return Response.json(
      {
        ok: false,
        error: `Under state law we cannot take on clients in ${EXCLUDED_STATES.join(
          " · ",
        )}. Veterans in those states have free assistance through the VA Office of General Counsel.`,
        fieldErrors: { state: "Not served in this state" },
      },
      { status: 422 },
    );
  }

  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  if (turnstileSecret) {
    if (!data.turnstileToken) {
      return Response.json(
        {
          ok: false,
          error: "Please complete the verification",
          fieldErrors: { turnstileToken: "Verification required" },
        },
        { status: 400 },
      );
    }
    const ip =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      null;
    const turnstileOk = await verifyTurnstile(turnstileSecret, data.turnstileToken, ip);
    if (!turnstileOk) {
      return Response.json(
        {
          ok: false,
          error: "Verification failed — please try again",
          fieldErrors: { turnstileToken: "Verification failed" },
        },
        { status: 400 },
      );
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !from || !to) {
    console.error("Contact route missing env vars: RESEND_API_KEY, CONTACT_FROM_EMAIL, or CONTACT_TO_EMAIL");
    return Response.json(
      { ok: false, error: "Something went wrong — please try again later" },
      { status: 500 },
    );
  }

  const resend = new Resend(apiKey);
  const submittedAt = new Date().toISOString();
  const referer = request.headers.get("referer") ?? "(direct)";
  const fullName = `${data.firstName} ${data.lastName}`;
  const subject = `VSUC contact · ${data.status ?? "No status"} · ${fullName}`;

  const textLines = [
    `From: ${fullName} <${data.email}>`,
    data.phone ? `Phone: ${data.phone}` : null,
    `State: ${data.state}`,
    `Status: ${data.status ?? "(not provided)"}`,
    `Submitted: ${submittedAt}`,
    `Referer: ${referer}`,
    "",
    "Message:",
    data.message,
  ].filter(Boolean);

  const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f1a2b; max-width: 560px;">
  <h2 style="margin: 0 0 16px; font-size: 18px;">New contact form submission</h2>
  <table cellpadding="6" style="border-collapse: collapse; font-size: 14px;">
    <tr><td style="color:#667085;">From</td><td>${escapeHtml(fullName)} &lt;${escapeHtml(data.email)}&gt;</td></tr>
    ${data.phone ? `<tr><td style="color:#667085;">Phone</td><td>${escapeHtml(data.phone)}</td></tr>` : ""}
    <tr><td style="color:#667085;">State</td><td>${escapeHtml(data.state)}</td></tr>
    <tr><td style="color:#667085;">Status</td><td>${escapeHtml(data.status ?? "(not provided)")}</td></tr>
    <tr><td style="color:#667085;">Submitted</td><td>${escapeHtml(submittedAt)}</td></tr>
    <tr><td style="color:#667085;">Referer</td><td>${escapeHtml(referer)}</td></tr>
  </table>
  <h3 style="margin: 20px 0 8px; font-size: 15px;">Message</h3>
  <div style="white-space: pre-wrap; padding: 12px 14px; background: #f6f7f9; border-radius: 8px; font-size: 14px; line-height: 1.5;">${escapeHtml(data.message)}</div>
</div>`.trim();

  const autoReplyText = `Hi ${data.firstName},

Thanks for reaching out to Veteran Services United. We got your note, and a real person — not a ticket system — will reply within one business day.

If you're in a hurry or would rather hear a voice, give us a call at (619) 550-8735, Monday through Friday, 8am to 6pm Central.

For your records, here's what you sent:

${data.message}

— The team at VSUC
veteranservicesunited.com`;

  const autoReplyHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f1a2b; max-width: 560px; line-height: 1.55;">
  <p>Hi ${escapeHtml(data.firstName)},</p>
  <p>Thanks for reaching out to <strong>Veteran Services United</strong>. We got your note, and a real person — not a ticket system — will reply within one business day.</p>
  <p>If you're in a hurry or would rather hear a voice, give us a call at <a href="tel:6195508735" style="color:#0f1a2b;"><strong>(619) 550-8735</strong></a>, Monday through Friday, 8am to 6pm Central.</p>
  <p style="color:#667085; font-size: 13px; margin-top: 28px;">For your records, here's what you sent:</p>
  <div style="white-space: pre-wrap; padding: 12px 14px; background: #f6f7f9; border-radius: 8px; font-size: 14px;">${escapeHtml(data.message)}</div>
  <p style="margin-top: 24px;">— The team at VSUC<br/><a href="https://veteranservicesunited.com" style="color:#667085; font-size: 13px;">veteranservicesunited.com</a></p>
</div>`.trim();

  try {
    const contactSend = await resend.emails.send({
      from,
      to,
      replyTo: data.email,
      subject,
      text: textLines.join("\n"),
      html: htmlBody,
    });
    if (contactSend.error) {
      console.error("Resend contact send error", contactSend.error);
      return Response.json(
        { ok: false, error: "Couldn't send right now — please try again" },
        { status: 502 },
      );
    }

    const autoReply = await resend.emails.send({
      from,
      to: data.email,
      subject: "We got your message — VSUC",
      text: autoReplyText,
      html: autoReplyHtml,
    });
    if (autoReply.error) {
      console.error("Resend auto-reply error (contact still delivered)", autoReply.error);
    }
  } catch (err) {
    console.error("Resend threw", err);
    return Response.json(
      { ok: false, error: "Couldn't send right now — please try again" },
      { status: 502 },
    );
  }

  return Response.json({ ok: true }, { status: 200 });
}
