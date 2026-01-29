/**
 * Mailgun email helper for Cloud Functions.
 * Configure via Firebase: firebase functions:config:set mailgun.api_key="key" mailgun.domain="mg.example.com"
 * Optional: mailgun.from_name="Factory Standards" mailgun.from_email="noreply@mg.example.com"
 * EU region: mailgun.api_host="https://api.eu.mailgun.net"
 */

import * as functions from "firebase-functions";

const DEFAULT_API_HOST = "https://api.mailgun.net";

const DEFAULT_ORMSBY_LOGO = "https://ormsbyguitars.com/cdn/shop/files/OrmsbyLogo_nosite_white_73380.png?v=1767617611&width=200";

export interface MailgunConfig {
  apiKey: string;
  domain: string;
  fromName: string;
  fromEmail: string;
  apiHost: string;
  portalUrl: string;
  logoUrl: string;
}

export function getMailgunConfig(): MailgunConfig | null {
  const config = functions.config().mailgun as Record<string, string> | undefined;
  if (!config?.api_key || !config?.domain) return null;
  return {
    apiKey: config.api_key,
    domain: config.domain,
    fromName: config.from_name || "Ormsby Guitars",
    fromEmail: config.from_email || `noreply@${config.domain}`,
    apiHost: config.api_host || DEFAULT_API_HOST,
    portalUrl: config.portal_url || "",
    logoUrl: config.logo_url || DEFAULT_ORMSBY_LOGO,
  };
}

/**
 * Send a single email via Mailgun. No-op if Mailgun is not configured.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<boolean> {
  const cfg = getMailgunConfig();
  if (!cfg) {
    functions.logger.info("Mailgun not configured; skipping email");
    return false;
  }
  const from = `${cfg.fromName} <${cfg.fromEmail}>`;
  const url = `${cfg.apiHost}/v3/${cfg.domain}/messages`;
  const auth = Buffer.from(`api:${cfg.apiKey}`).toString("base64");

  const body = new URLSearchParams();
  body.set("from", from);
  body.set("to", to);
  body.set("subject", subject);
  body.set("html", html);
  if (text) body.set("text", text);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    if (!res.ok) {
      const errText = await res.text();
      functions.logger.error("Mailgun error", { status: res.status, body: errText });
      return false;
    }
    return true;
  } catch (err: unknown) {
    functions.logger.error("Mailgun send failed", err);
    return false;
  }
}
