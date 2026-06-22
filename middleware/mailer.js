"use strict";

const nodemailer = require("nodemailer");
const logger     = require("./logger");

// ---- Transport ----
// Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in Railway environment variables.
// Works with Gmail, SendGrid, Mailgun, Resend, or any SMTP provider.
// For Gmail: use an App Password (not your regular password).
function createTransport() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const FROM_NAME    = process.env.EMAIL_FROM_NAME  || "StayMaster Pro";
const FROM_EMAIL   = process.env.EMAIL_FROM       || process.env.SMTP_USER || "noreply@staymasterpro.com";
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL     || process.env.SMTP_USER || "sales@staymasterpro.com";

async function sendMail(to, subject, html) {
  const transport = createTransport();
  if (!transport) {
    logger.warn("Email not sent — SMTP not configured");
    return false;
  }
  try {
    await transport.sendMail({
      from:    `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    logger.error("Email send error", { err: err.message });
    return false;
  }
}

// ---- Email templates ----

async function sendBookingConfirmation({ fullName, email, date, slot, confirmationNo }) {
  const formattedDate = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const [h, m] = slot.split(":").map(Number);
  const start  = new Date(2000, 0, 1, h, m);
  const end    = new Date(2000, 0, 1, h, m + 30);
  const fmt    = t => t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const timeStr = `${fmt(start)} – ${fmt(end)} EST`;

  const html = `
    <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:#0B1F3A;padding:32px 40px;text-align:center;">
        <h1 style="color:#fff;font-size:22px;margin:0;">StayMaster Pro</h1>
        <p style="color:#00A6A6;margin:4px 0 0;font-size:14px;">Demo Booking Confirmed</p>
      </div>
      <div style="padding:32px 40px;">
        <p style="font-size:16px;color:#0B1F3A;">Hi ${fullName},</p>
        <p style="color:#475569;">Your demo session has been booked. Here are your details:</p>
        <div style="background:#f8fafc;border-radius:10px;padding:20px 24px;margin:24px 0;border:1px solid #e2e8f0;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#64748b;font-size:14px;">Date</td><td style="padding:8px 0;font-weight:700;color:#0B1F3A;font-size:14px;">${formattedDate}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:14px;">Time</td><td style="padding:8px 0;font-weight:700;color:#0B1F3A;font-size:14px;">${timeStr}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:14px;">Duration</td><td style="padding:8px 0;font-weight:700;color:#0B1F3A;font-size:14px;">30 minutes</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:14px;">Reference</td><td style="padding:8px 0;font-weight:700;color:#00A6A6;font-size:14px;">${confirmationNo}</td></tr>
          </table>
        </div>
        <p style="color:#475569;font-size:14px;">Our team will send a video call link to this email before the session. If you need to reschedule or cancel, reply to this email with your reference number.</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="https://staymasterpro.com" style="background:#00A6A6;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Visit StayMaster Pro</a>
        </div>
      </div>
      <div style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="color:#94a3b8;font-size:12px;margin:0;">© 2026 StayMaster Pro · <a href="https://staymasterpro.com" style="color:#94a3b8;">staymasterpro.com</a></p>
      </div>
    </div>
  `;

  await sendMail(email, `Demo Confirmed — ${formattedDate} · ${timeStr}`, html);
  await sendMail(NOTIFY_EMAIL, `[New Demo Booked] ${fullName} — ${formattedDate} ${timeStr} (${confirmationNo})`,
    `<p><strong>${fullName}</strong> (${email}) booked a demo on <strong>${formattedDate}</strong> at <strong>${timeStr}</strong>.<br>Ref: ${confirmationNo}</p>`
  );
}

async function sendContactNotification({ fullName, email, phone, company, message, interestedPlan }) {
  await sendMail(
    NOTIFY_EMAIL,
    `[New Contact] ${fullName} — ${interestedPlan || "General inquiry"}`,
    `<p><strong>Name:</strong> ${fullName}<br>
     <strong>Email:</strong> ${email}<br>
     <strong>Phone:</strong> ${phone || "—"}<br>
     <strong>Company:</strong> ${company || "—"}<br>
     <strong>Plan:</strong> ${interestedPlan || "—"}<br>
     <strong>Message:</strong><br>${message || "—"}</p>`
  );
}

async function sendTrialWelcome({ name, email, plan }) {
  const planNames = { starter: "Starter", growth: "Growth", professional: "Professional" };
  const planName  = planNames[plan] || plan || "Starter";

  const html = `
    <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:#0B1F3A;padding:32px 40px;text-align:center;">
        <h1 style="color:#fff;font-size:22px;margin:0;">StayMaster Pro</h1>
        <p style="color:#F4C95D;margin:4px 0 0;font-size:14px;">Welcome to Your Free Trial 🎉</p>
      </div>
      <div style="padding:32px 40px;">
        <p style="font-size:16px;color:#0B1F3A;">Hi ${name},</p>
        <p style="color:#475569;">Your 14-day free trial of the <strong>${planName}</strong> plan has started. No credit card required.</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${process.env.APP_URL || "https://app.staymasterpro.com"}/login" style="background:#00A6A6;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Go to Dashboard →</a>
        </div>
        <p style="color:#475569;font-size:14px;">Need help getting started? <a href="https://staymasterpro.com/#contact" style="color:#00A6A6;">Contact our team</a> anytime.</p>
      </div>
      <div style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="color:#94a3b8;font-size:12px;margin:0;">© 2026 StayMaster Pro · <a href="https://staymasterpro.com" style="color:#94a3b8;">staymasterpro.com</a></p>
      </div>
    </div>
  `;

  await sendMail(email, `Welcome to StayMaster Pro — Your ${planName} trial is ready`, html);
  await sendMail(NOTIFY_EMAIL, `[New Trial] ${name} — ${planName} plan`, `<p><strong>${name}</strong> (${email}) started a <strong>${planName}</strong> trial.</p>`);
}

module.exports = { sendBookingConfirmation, sendContactNotification, sendTrialWelcome };
