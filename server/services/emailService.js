const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = (process.env.SMTP_USER || '').trim();
    let pass = (process.env.SMTP_PASS || '').trim();
    // Normalize Google 16-character App passwords (e.g. "kwld vaid mqgj yfch" -> "kwldvaidmqgjyfch")
    if (host.includes('gmail.com') && pass.replace(/\s+/g, '').length === 16) {
      pass = pass.replace(/\s+/g, '');
    }

    if (user && pass && pass !== 'your_smtp_app_password_here') {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        tls: {
          rejectUnauthorized: false, // Prevents self-signed / local development cert rejections
        },
      });
      console.log(`[EmailService] SMTP transporter configured for ${user} (${host}:${port})`);
    } else {
      this.transporter = null;
      console.log('[EmailService] SMTP credentials not set or placeholder detected in .env. Email dispatch will operate in simulation/log mode.');
    }
  }

  /**
   * Verify SMTP connectivity
   */
  async verifyConnection() {
    if (!this.transporter) {
      return { success: false, message: 'SMTP credentials not configured in .env' };
    }
    try {
      await this.transporter.verify();
      return { success: true, message: 'SMTP connection verified successfully' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  /**
   * Send Organization Onboarding Welcome Email with Banner and Client Credentials
   */
  async sendOnboardingWelcomeEmail({
    to,
    companyName,
    uniqueId,
    slug,
    plan = 'PRO',
    adminName,
    username,
    password,
    contactPhone,
    contactEmail,
    address,
    adminBranch,
    loginUrl,
  }) {
    const targetEmail = (to || contactEmail || '').trim();
    if (!targetEmail) {
      console.warn('[EmailService Warning] No recipient email specified for onboarding credentials.');
      return { success: false, error: 'Recipient email is missing' };
    }

    const fromName = process.env.SMTP_FROM_NAME || 'MrCargo Logistics Platform';
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'mrcargo59@gmail.com';
    const portalUrl = loginUrl || process.env.CLIENT_PORTAL_URL || 'http://localhost:5173/#login';
    const cleanId = uniqueId || slug?.toUpperCase() || 'ORG-ID';

    const subject = `Welcome to MrCargo: ${companyName} - Organization Workspace & Credentials`;

    // High-impact responsive HTML Email with Branded Banner and Credentials Card
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f1f5f9;
      color: #1e293b;
      line-height: 1.5;
    }
    .wrapper {
      width: 100%;
      background-color: #f1f5f9;
      padding: 24px 12px;
    }
    .container {
      max-width: 620px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
      border: 1px solid #e2e8f0;
    }
    /* Banner Header */
    .banner {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0284c7 100%);
      padding: 36px 28px;
      color: #ffffff;
      text-align: center;
      position: relative;
    }
    .banner-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: #38bdf8;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      padding: 4px 12px;
      border-radius: 999px;
      margin-bottom: 12px;
    }
    .banner-title {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0 0 6px;
      color: #ffffff;
    }
    .banner-sub {
      font-size: 13px;
      color: #cbd5e1;
      margin: 0;
    }
    /* Main Content */
    .content {
      padding: 28px 24px;
    }
    .greeting {
      font-size: 15px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 12px;
    }
    .intro-text {
      font-size: 14px;
      color: #475569;
      margin-bottom: 24px;
    }
    /* Organization Profile Card */
    .card-section {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 18px 20px;
      margin-bottom: 20px;
    }
    .card-title {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #2563eb;
      margin: 0 0 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      border-bottom: 1px solid #edf2f7;
      font-size: 13px;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #64748b;
      font-weight: 500;
    }
    .info-val {
      color: #0f172a;
      font-weight: 600;
      text-align: right;
    }
    /* Credentials High-Security Callout Card */
    .cred-card {
      background: linear-gradient(180deg, #ecfdf5 0%, #f0fdf4 100%);
      border: 2px solid #6ee7b7;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .cred-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    .cred-title {
      font-size: 13px;
      font-weight: 800;
      color: #065f46;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0;
    }
    .cred-badge {
      background-color: #d1fae5;
      color: #047857;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #a7f3d0;
    }
    .cred-box {
      background-color: #ffffff;
      border: 1px solid #a7f3d0;
      border-radius: 6px;
      padding: 12px 14px;
      margin-bottom: 14px;
    }
    .cred-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      font-size: 13px;
    }
    .cred-item:not(:last-child) {
      border-bottom: 1px dashed #e2e8f0;
    }
    .code-val {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      background: #f8fafc;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
    }
    .pwd-val {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 14px;
      font-weight: 700;
      color: #b91c1c;
      background: #fef2f2;
      padding: 3px 10px;
      border-radius: 4px;
      border: 1px solid #fecaca;
    }
    /* CTA Button */
    .btn-container {
      text-align: center;
      margin: 20px 0 6px;
    }
    .btn-cta {
      display: inline-block;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: #ffffff !important;
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
      padding: 13px 32px;
      border-radius: 8px;
      box-shadow: 0 4px 10px rgba(37, 99, 235, 0.35);
      letter-spacing: 0.2px;
    }
    /* Steps Box */
    .steps-box {
      border-top: 1px dashed #cbd5e1;
      padding-top: 18px;
      margin-top: 20px;
      font-size: 13px;
      color: #475569;
    }
    .step-item {
      margin-bottom: 8px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .step-num {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background-color: #eff6ff;
      color: #2563eb;
      font-weight: 700;
      font-size: 11px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }
    /* Footer */
    .footer {
      background-color: #0f172a;
      color: #94a3b8;
      padding: 24px;
      text-align: center;
      font-size: 12px;
      line-height: 1.6;
    }
    .footer-brand {
      color: #ffffff;
      font-weight: 700;
      font-size: 13px;
      margin-bottom: 4px;
    }
    .footer a {
      color: #38bdf8;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      
      <!-- HERO BANNER -->
      <div class="banner">
        <div class="banner-badge">Official Onboarding Notification</div>
        <h1 class="banner-title">Welcome to MrCargo</h1>
        <p class="banner-sub">Your Multi-Tenant Courier & Dispatch Workspace is Live</p>
      </div>

      <!-- MAIN CONTENT -->
      <div class="content">
        <div class="greeting">Dear ${adminName || companyName},</div>
        <p class="intro-text">
          Congratulations! Your courier business <strong>${companyName}</strong> has been successfully registered and activated on the <strong>MrCargo Logistics Platform</strong>. Your centralized dashboard is ready to manage consignment bookings, fleet operations, and counter dispatches.
        </p>

        <!-- ORGANIZATION DETAILS CARD -->
        <div class="card-section">
          <div class="card-title">🏛️ Registered Courier Business Profile</div>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Organization Name:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 700; font-size: 13px; text-align: right;">${companyName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Unique Organization ID:</td>
              <td style="padding: 6px 0; text-align: right;">
                <span class="code-val">${cleanId}</span>
              </td>
            </tr>
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Subscription Plan:</td>
              <td style="padding: 6px 0; color: #2563eb; font-weight: 700; font-size: 12px; text-align: right;">${plan} PLAN</td>
            </tr>
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Official Contact Phone:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600; font-size: 13px; text-align: right;">${contactPhone || '—'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #edf2f7;">
              <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Registered Email:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600; font-size: 13px; text-align: right;">${targetEmail}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Head Office / Hub:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 500; font-size: 13px; text-align: right;">${address || 'Central Office Hub'}</td>
            </tr>
          </table>
        </div>

        <!-- CLIENT LOGIN CREDENTIALS CARD -->
        <div class="cred-card">
          <div class="cred-header">
            <span class="cred-title">🔐 Master Admin Access Credentials</span>
            <span class="cred-badge">Confidential</span>
          </div>
          
          <p style="font-size: 12px; color: #065f46; margin: 0 0 10px;">
            Use these credentials to sign in to your dedicated administrator workspace:
          </p>

          <div class="cred-box">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px dashed #e2e8f0;">
                <td style="padding: 6px 0; color: #475569; font-size: 13px;">Username / ID:</td>
                <td style="padding: 6px 0; text-align: right;">
                  <span class="code-val">${username}</span>
                </td>
              </tr>
              <tr style="border-bottom: 1px dashed #e2e8f0;">
                <td style="padding: 6px 0; color: #475569; font-size: 13px;">Temporary Password:</td>
                <td style="padding: 6px 0; text-align: right;">
                  <span class="pwd-val">${password}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #475569; font-size: 13px;">Account Privilege:</td>
                <td style="padding: 6px 0; color: #059669; font-weight: 700; font-size: 12px; text-align: right;">Tenant Administrator</td>
              </tr>
            </table>
          </div>

          <div class="btn-container">
            <a href="${portalUrl}" class="btn-cta" target="_blank">
              Launch Workspace & Log In &rarr;
            </a>
          </div>
          
          <div style="font-size: 11px; color: #059669; text-align: center; margin-top: 10px;">
            Portal URL: <a href="${portalUrl}" style="color: #059669; word-break: break-all;">${portalUrl}</a>
          </div>
        </div>

        <!-- GETTING STARTED NEXT STEPS -->
        <div class="steps-box">
          <div style="font-weight: 700; color: #0f172a; margin-bottom: 10px; font-size: 13px;">
            🚀 Quick Start Checklist:
          </div>
          <div class="step-item">
            <span class="step-num">1</span>
            <div><strong>Sign In:</strong> Log into your portal using the credentials provided above.</div>
          </div>
          <div class="step-item">
            <span class="step-num">2</span>
            <div><strong>Set Up Staff & Fleet:</strong> Add branch counter operators, driver profiles, and assign route transit buses.</div>
          </div>
          <div class="step-item">
            <span class="step-num">3</span>
            <div><strong>Dispatch Consignments:</strong> Create instant parcel bookings, print thermal receipts, and notify consignees via WhatsApp.</div>
          </div>
        </div>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <div class="footer-brand">MrCargo Logistics Platform</div>
        <div>Enterprise Multi-Tenant Bus Parcel & Consignment Management System</div>
        <div style="margin-top: 8px; color: #64748b; font-size: 11px;">
          Support Helpline: <a href="mailto:${fromEmail}">${fromEmail}</a>
        </div>
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 10px; color: #475569;">
          This message contains confidential security credentials for authorized personnel of ${companyName}. If you have received this message by error, please contact support and delete this email immediately.
        </div>
      </div>

    </div>
  </div>
</body>
</html>
`;

    // Plaintext fallback for accessibility & simple mail agents
    const text = `
===========================================================
WELCOME TO MRCARGO: ${companyName.toUpperCase()}
===========================================================
Your courier business has been onboarded to the MrCargo Logistics Platform.

--- ORGANIZATION PROFILE ---
Organization: ${companyName}
Unique ID: ${cleanId}
Plan Tier: ${plan} PLAN
Official Phone: ${contactPhone || '—'}
Official Email: ${targetEmail}
Office Address: ${address || 'Central Office'}

--- YOUR CLIENT ACCESS CREDENTIALS ---
Portal Login URL: ${portalUrl}
Admin Username: ${username}
Temporary Password: ${password}
Account Role: Tenant Administrator

--- GETTING STARTED ---
1. Sign in to your portal using the URL and credentials above.
2. We recommend updating your temporary password upon first login.
3. Add counter staff, register transit buses, and begin booking parcels.

Need help? Contact platform support at ${fromEmail}.
===========================================================
`;

    // If transporter is not configured, simulate and log email in development
    if (!this.transporter) {
      console.log(`\n================== [EMAIL SIMULATION: ONBOARDING] ==================`);
      console.log(`To: ${targetEmail}`);
      console.log(`From: "${fromName}" <${fromEmail}>`);
      console.log(`Subject: ${subject}`);
      console.log(`Client Credentials: Username=${username} | Password=${password}`);
      console.log(`Portal URL: ${portalUrl}`);
      console.log(`Note: Configure SMTP_USER and SMTP_PASS in .env to deliver real emails.`);
      console.log(`=====================================================================\n`);
      return {
        success: true,
        simulated: true,
        message: `Email simulated (SMTP keys pending in .env). Credentials generated for ${targetEmail}.`,
      };
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: targetEmail,
        subject,
        text,
        html,
      });
      console.log(`[EmailService] ✅ Onboarding welcome email sent to ${targetEmail} (Message ID: ${info.messageId})`);
      return {
        success: true,
        messageId: info.messageId,
        message: `Welcome email with credentials dispatched to ${targetEmail}`,
      };
    } catch (err) {
      console.error(`[EmailService Error] Failed to send email to ${targetEmail}:`, err.message);
      return {
        success: false,
        error: err.message,
        message: `Failed to deliver email: ${err.message}`,
      };
    }
  }
}

const emailService = new EmailService();
module.exports = emailService;
