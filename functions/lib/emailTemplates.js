"use strict";
/**
 * Shared HTML email templates. Email-safe: table layout, inline styles, max-width 600px.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapHtml = wrapHtml;
exports.stageChangeHtml = stageChangeHtml;
exports.welcomeLoginHtml = welcomeLoginHtml;
exports.runUpdateHtml = runUpdateHtml;
function escapeHtml(s) {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
/**
 * Wraps content in a consistent layout: header with logo, content area, Log in button, signature.
 */
function wrapHtml(opts, contentHtml, ctaText = "Log in") {
    const brand = escapeHtml(opts.brandName);
    const logoUrl = opts.logoUrl && opts.logoUrl.startsWith("http") ? opts.logoUrl : "";
    const headerContent = logoUrl
        ? `<img src="${escapeHtml(logoUrl)}" alt="${brand}" width="160" height="48" style="display:block;height:48px;width:auto;max-width:200px;" />`
        : `<p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">${brand}</p>`;
    const ctaHtml = opts.portalUrl && opts.portalUrl.startsWith("http")
        ? `<a href="${escapeHtml(opts.portalUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff !important;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:16px;">${escapeHtml(ctaText)}</a>`
        : escapeHtml(ctaText);
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brand}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
          <tr>
            <td style="background-color:#1f2937;padding:24px 28px;text-align:left;">
              ${headerContent}
              <p style="margin:8px 0 0 0;font-size:13px;color:#9ca3af;">Build updates</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px;">
              ${contentHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 28px 28px;border-top:1px solid #e5e7eb;background-color:#fafafa;">
              <p style="margin:0 0 20px 0;font-size:14px;color:#4b5563;">${typeof ctaHtml === "string" && ctaHtml.startsWith("<a ") ? ctaHtml : `<span>${ctaHtml}</span>`}</p>
              <p style="margin:0;font-size:13px;color:#9ca3af;">— ${brand}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}
/**
 * Stage change email: guitar moved to a new build stage.
 */
function stageChangeHtml(opts, guitarLabel, runName, oldStageLabel, newStageLabel) {
    const content = `
    <p style="margin:0 0 16px 0;">Hi,</p>
    <p style="margin:0 0 20px 0;color:#374151;">Your guitar build has moved to a new stage.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:8px;margin-bottom:20px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 4px 0;font-size:18px;font-weight:600;color:#111827;">${escapeHtml(guitarLabel)}</p>
          <p style="margin:0;font-size:14px;color:#6b7280;">${escapeHtml(runName)}</p>
          <p style="margin:12px 0 0 0;font-size:14px;color:#374151;">
            <span style="color:#6b7280;">${escapeHtml(oldStageLabel)}</span>
            <span style="margin:0 8px;color:#9ca3af;">→</span>
            <strong style="color:#2563eb;">${escapeHtml(newStageLabel)}</strong>
          </p>
        </td>
      </tr>
    </table>
    <p style="margin:0;color:#6b7280;font-size:14px;">Log in to see full details and photos.</p>
  `.trim();
    return wrapHtml(opts, content, "Log in");
}
/**
 * Welcome / login intro email: sent when staff create a new client account.
 * Tells the user they have a login and password (or set-password link) and points them to the portal.
 */
function welcomeLoginHtml(opts, loginEmail, password, setPasswordLink) {
    const emailBlock = `
    <p style="margin:0 0 16px 0;">Hi,</p>
    <p style="margin:0 0 16px 0;color:#374151;">Your account is set up. You have a login and password for the ${escapeHtml(opts.brandName)} portal.</p>
    <p style="margin:0 0 8px 0;font-size:14px;color:#6b7280;">Log in with this email:</p>
    <p style="margin:0 0 16px 0;font-family:monospace;font-size:14px;color:#111827;background:#f3f4f6;padding:10px 12px;border-radius:6px;">${escapeHtml(loginEmail)}</p>
  `;
    const passwordBlock = password && password.length > 0
        ? `
    <p style="margin:0 0 8px 0;font-size:14px;color:#6b7280;">Your temporary password:</p>
    <p style="margin:0 0 16px 0;font-family:monospace;font-size:14px;color:#111827;background:#f3f4f6;padding:10px 12px;border-radius:6px;">${escapeHtml(password)}</p>
    <p style="margin:0 0 16px 0;font-size:14px;color:#6b7280;">We recommend changing it after your first login.</p>
  `
        : setPasswordLink && setPasswordLink.length > 0
            ? `
    <p style="margin:0 0 12px 0;font-size:14px;color:#374151;">Set your password using the link below:</p>
    <p style="margin:0 0 16px 0;"><a href="${escapeHtml(setPasswordLink)}" style="color:#2563eb;text-decoration:underline;word-break:break-all;">${escapeHtml(setPasswordLink)}</a></p>
  `
            : "";
    const content = `
    ${emailBlock}
    ${passwordBlock}
    <p style="margin:0;color:#374151;">Log in below to view your guitars and build updates.</p>
  `.trim();
    return wrapHtml(opts, content, "Log in");
}
/**
 * Run update email: staff posted an update visible to clients.
 */
function runUpdateHtml(opts, runName, title, authorName, message) {
    const messageHtml = message
        ? message
            .split("\n")
            .map((line) => `<p style="margin:0 0 8px 0;color:#374151;">${escapeHtml(line)}</p>`)
            .join("")
        : "";
    const content = `
    <p style="margin:0 0 16px 0;">Hi,</p>
    <p style="margin:0 0 12px 0;color:#374151;"><strong>${escapeHtml(authorName)}</strong> posted an update to <strong>${escapeHtml(runName)}</strong>:</p>
    <p style="margin:0 0 16px 0;font-size:18px;font-weight:600;color:#111827;">${escapeHtml(title)}</p>
    <div style="color:#374151;margin-bottom:16px;">${messageHtml || "<p style='margin:0;'>No additional message.</p>"}</div>
    <p style="margin:0;color:#6b7280;font-size:14px;">Log in to see the full update and any photos.</p>
  `.trim();
    return wrapHtml(opts, content, "Log in");
}
//# sourceMappingURL=emailTemplates.js.map