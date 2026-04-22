function getTransport() {
  let nodemailer;
  try {
    nodemailer = require("nodemailer");
  } catch (error) {
    throw new Error("nodemailer is not installed. Run `npm install nodemailer` in backend.");
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS to backend .env");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}

function buildComplaintNotification({ userName, subject, status, adminResponse }) {
  const normalizedStatus = String(status || "").replaceAll("_", " ");
  const headlineMap = {
    PENDING: `Your complaint is now "PENDING".`,
    IN_PROGRESS: `Your complaint is now "IN PROGRESS".`,
    RESOLVED: `Your complaint has been "RESOLVED".`,
    REJECTED: `Your complaint has been "REJECTED". Please check details.`
  };

  const headline = headlineMap[status] || `Your complaint status has been updated to "${normalizedStatus}".`;

  return {
    subject: `Complaint Update - ${normalizedStatus}`,
    text: `Hello ${userName || "User"},\n\n${headline}\n\nComplaint Subject: ${subject}\nAdmin Response: ${adminResponse}\n\nPlease log in to your dashboard to view the latest complaint details.`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:32px;color:#10233f;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;border:1px solid #dbe5f0;">
          <div style="font-size:24px;font-weight:800;margin-bottom:10px;">CyberShield</div>
          <div style="font-size:20px;font-weight:700;margin-bottom:14px;">Complaint Update</div>
          <p style="margin:0 0 14px;line-height:1.7;">Hello ${userName || "User"},</p>
          <p style="margin:0 0 18px;line-height:1.7;">${headline}</p>
          <div style="padding:16px;border-radius:16px;background:#eef6ff;border:1px solid #c8dcff;margin:0 0 18px;">
            <div style="margin-bottom:8px;"><strong>Complaint Subject:</strong> ${subject}</div>
            <div><strong>Admin Response:</strong> ${adminResponse}</div>
          </div>
          <p style="margin:0;line-height:1.7;color:#475569;">Please log in to your dashboard to view the latest complaint details.</p>
        </div>
      </div>
    `
  };
}

async function sendComplaintStatusEmail({ toEmail, userName, subject, status, adminResponse }) {
  const from = process.env.NOTIFICATION_FROM_EMAIL || process.env.SMTP_USER;
  const transport = getTransport();
  const content = buildComplaintNotification({ userName, subject, status, adminResponse });

  await transport.sendMail({
    from,
    to: toEmail,
    subject: content.subject,
    text: content.text,
    html: content.html
  });
}

module.exports = {
  sendComplaintStatusEmail
};
