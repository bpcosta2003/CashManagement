import { Resend } from "resend";
import { env } from "./env";

let client: Resend | null = null;

function getClient(): Resend {
  if (!client) {
    client = new Resend(env.resendApiKey);
  }
  return client;
}

export interface EmailMessage {
  to: string;
  subject: string;
  /** HTML completo do corpo do email. */
  html: string;
  /** Texto plano (fallback). */
  text: string;
}

export async function sendEmail(msg: EmailMessage): Promise<void> {
  const resend = getClient();
  const { error } = await resend.emails.send({
    from: env.fromEmail,
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
  });
  if (error) {
    throw new Error(`resend_error: ${error.message ?? "unknown"}`);
  }
}

/* ─── Template ──────────────────────────────────────────────────────
 *
 * Replica o visual do magic link do Supabase: card branco centralizado,
 * cabeçalho com nome do produto, conteúdo em sans-serif e CTA em
 * accent color. Tudo inline pra compatibilidade com clients de email.
 */

interface RenderParams {
  /** "Resumo de Maio" ou "Lembrete: meta de Junho", etc. */
  preheader: string;
  /** Saudação personalizada ("Olá, Bruno"). */
  greeting: string;
  /** Texto introdutório curto. */
  intro: string;
  /** Blocos de conteúdo em ordem. */
  blocks: EmailBlock[];
  /** Texto + URL do botão principal. */
  cta: { label: string; href: string };
  /** Linha final (assinatura, opt-out). */
  footer: string;
}

export type EmailBlock =
  | { kind: "section"; title: string; body: string }
  | { kind: "list"; title: string; items: string[] }
  | { kind: "warning"; title: string; body: string };

const PRIMARY = "#7a1f2b"; // bordo padrão — accent default do app
const SOFT = "#fcf7f6";
const BORDER = "#e8d8d4";
const TEXT = "#241317";
const MUTED = "#7a6a6e";

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderBlock(b: EmailBlock): string {
  if (b.kind === "list") {
    const items = b.items
      .map(
        (it) =>
          `<li style="margin: 6px 0; line-height: 1.55;">${escape(it)}</li>`,
      )
      .join("");
    return `
      <div style="margin: 24px 0;">
        <h3 style="font-size: 15px; font-weight: 600; color: ${TEXT}; margin: 0 0 8px;">${escape(b.title)}</h3>
        <ul style="margin: 0; padding-left: 20px; color: ${TEXT}; font-size: 14px;">${items}</ul>
      </div>`;
  }
  if (b.kind === "warning") {
    return `
      <div style="margin: 24px 0; padding: 14px 16px; background: ${SOFT}; border: 1px solid ${BORDER}; border-radius: 10px; border-left: 3px solid ${PRIMARY};">
        <strong style="display: block; color: ${TEXT}; font-size: 14px; margin-bottom: 4px;">${escape(b.title)}</strong>
        <span style="color: ${TEXT}; font-size: 14px; line-height: 1.55;">${escape(b.body)}</span>
      </div>`;
  }
  return `
    <div style="margin: 24px 0;">
      <h3 style="font-size: 15px; font-weight: 600; color: ${TEXT}; margin: 0 0 8px;">${escape(b.title)}</h3>
      <p style="margin: 0; color: ${TEXT}; font-size: 14px; line-height: 1.6;">${escape(b.body)}</p>
    </div>`;
}

export function renderEmailHtml(p: RenderParams): string {
  const blocks = p.blocks.map(renderBlock).join("");
  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escape(p.preheader)}</title>
  </head>
  <body style="margin: 0; padding: 0; background: ${SOFT}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: ${TEXT};">
    <span style="display: none; visibility: hidden; opacity: 0; height: 0; width: 0; overflow: hidden;">${escape(p.preheader)}</span>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: ${SOFT};">
      <tr>
        <td align="center" style="padding: 32px 16px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 520px; background: #ffffff; border-radius: 14px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); overflow: hidden;">
            <tr>
              <td style="padding: 28px 32px 12px; border-bottom: 1px solid ${BORDER};">
                <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 20px; font-weight: 600; color: ${PRIMARY}; letter-spacing: -0.01em;">Cash Management</div>
              </td>
            </tr>
            <tr>
              <td style="padding: 28px 32px 8px;">
                <h1 style="font-size: 20px; font-weight: 600; color: ${TEXT}; margin: 0 0 12px; letter-spacing: -0.01em;">${escape(p.greeting)}</h1>
                <p style="font-size: 15px; color: ${TEXT}; margin: 0; line-height: 1.6;">${escape(p.intro)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 32px;">
                ${blocks}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 16px 32px 32px;">
                <a href="${escape(p.cta.href)}" style="display: inline-block; background: ${PRIMARY}; color: #ffffff; text-decoration: none; padding: 12px 22px; border-radius: 999px; font-weight: 600; font-size: 14px;">${escape(p.cta.label)}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px 32px 28px; border-top: 1px solid ${BORDER}; background: ${SOFT};">
                <p style="font-size: 12px; color: ${MUTED}; margin: 0; line-height: 1.55;">${escape(p.footer)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderEmailText(p: RenderParams): string {
  const lines: string[] = [];
  lines.push(p.greeting);
  lines.push("");
  lines.push(p.intro);
  lines.push("");
  for (const b of p.blocks) {
    if (b.kind === "list") {
      lines.push(b.title);
      for (const it of b.items) lines.push(`  - ${it}`);
    } else {
      lines.push(b.title);
      lines.push(b.body);
    }
    lines.push("");
  }
  lines.push(`${p.cta.label}: ${p.cta.href}`);
  lines.push("");
  lines.push(p.footer);
  return lines.join("\n");
}
