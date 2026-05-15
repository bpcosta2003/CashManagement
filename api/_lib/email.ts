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
  html: string;
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
 * Espelha exatamente o template do magic link (docs/email-template-
 * magic-link.html): hero escuro com logo+título+eyebrow, hairline
 * champagne, conteúdo em sans-serif, CTA pill em wine, footer fora do
 * card. Mantém compatibilidade com clientes legados via tabelas e
 * inline styles.
 */

export type EmailBlock =
  | { kind: "section"; title: string; body: string }
  | { kind: "list"; title: string; items: string[] }
  | { kind: "warning"; title: string; body: string };

interface RenderParams {
  /** Texto curto exibido na barra de preview do client (oculto no corpo). */
  preheader: string;
  /** Eyebrow em uppercase no hero ("RESUMO DO MÊS", "LEMBRETE DE METAS"). */
  eyebrow: string;
  /** Saudação ("Olá," / "Bom dia,"). */
  greeting: string;
  /** Parágrafo introdutório (pode conter HTML inline simples — usar com cuidado). */
  intro: string;
  /** Blocos de conteúdo em ordem. */
  blocks: EmailBlock[];
  /** Texto + URL do botão principal. */
  cta: { label: string; href: string };
  /** Linha final em itálico/cinza, dentro do card. Tipicamente o opt-out. */
  disclaimer: string;
}

/* Paleta — replica magic-link.html */
const PAGE_BG = "#f5f0e8";
const CARD_BG = "#fffdfc";
const CARD_BORDER = "#e7ded2";
const HERO_BG = "#2e2623";
const HERO_TITLE = "#f5efe7";
const HERO_EYEBROW = "#b8aca3";
const HAIRLINE = "#b89a63";
const TEXT = "#2e2623";
const MUTED_2 = "#9a928c";
const CTA_BG = "#5a2e3f";
const ACCENT_SOFT = "#f0e6e3";

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
          `<li style="margin:6px 0;line-height:1.6;font-size:14px;color:${TEXT};">${escape(it)}</li>`,
      )
      .join("");
    return `
      <tr>
        <td style="padding:0 32px 18px;">
          <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:${TEXT};line-height:1.5;">${escape(b.title)}</p>
          <ul style="margin:0;padding-left:20px;color:${TEXT};">${items}</ul>
        </td>
      </tr>`;
  }
  if (b.kind === "warning") {
    return `
      <tr>
        <td style="padding:0 32px 18px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${ACCENT_SOFT};border-radius:12px;border-left:3px solid ${CTA_BG};">
            <tr>
              <td style="padding:14px 16px;">
                <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:${TEXT};line-height:1.5;">${escape(b.title)}</p>
                <p style="margin:0;font-size:14px;color:${TEXT};line-height:1.6;">${escape(b.body).replace(/\n/g, "<br>")}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
  }
  return `
    <tr>
      <td style="padding:0 32px 18px;">
        <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:${TEXT};line-height:1.5;">${escape(b.title)}</p>
        ${b.body ? `<p style="margin:0;font-size:14px;color:${TEXT};line-height:1.6;">${escape(b.body)}</p>` : ""}
      </td>
    </tr>`;
}

export function renderEmailHtml(p: RenderParams): string {
  const logoUrl = `${env.appUrl.replace(/\/$/, "")}/brand-dark.png`;
  const blocks = p.blocks.map(renderBlock).join("");
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>${escape(p.preheader)}</title>
  </head>
  <body style="margin:0;padding:0;background:${PAGE_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:${TEXT};-webkit-font-smoothing:antialiased;">
    <span style="display:none;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${escape(p.preheader)}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${PAGE_BG};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:480px;width:100%;background:${CARD_BG};border:1px solid ${CARD_BORDER};border-radius:18px;overflow:hidden;box-shadow:0 6px 24px rgba(70,45,50,0.08);">
            <!-- Hero escuro com logo -->
            <tr>
              <td style="background:${HERO_BG};padding:32px 32px 28px;text-align:center;">
                <img src="${logoUrl}" width="72" height="72" alt="Controle de Caixa" style="display:inline-block;width:72px;height:72px;border-radius:16px;" />
                <h1 style="margin:18px 0 6px;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;font-size:22px;font-weight:700;letter-spacing:-0.02em;color:${HERO_TITLE};">
                  Controle de Caixa
                </h1>
                <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:${HERO_EYEBROW};">
                  ${escape(p.eyebrow)}
                </p>
              </td>
            </tr>

            <!-- Hairline champagne -->
            <tr>
              <td style="height:1px;background:${HAIRLINE};line-height:0;font-size:0;">&nbsp;</td>
            </tr>

            <!-- Saudação + intro -->
            <tr>
              <td style="padding:32px 32px 8px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:${TEXT};">
                  ${escape(p.greeting)}
                </p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${TEXT};">
                  ${escape(p.intro)}
                </p>
              </td>
            </tr>

            <!-- Blocos -->
            ${blocks}

            <!-- CTA -->
            <tr>
              <td style="padding:8px 32px 24px;text-align:center;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                  <tr>
                    <td style="background:${CTA_BG};border-radius:999px;box-shadow:0 4px 14px rgba(90,46,63,0.22);">
                      <a href="${escape(p.cta.href)}" style="display:inline-block;padding:14px 32px;font-family:Inter,-apple-system,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">
                        ${escape(p.cta.label)}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Separador -->
            <tr>
              <td style="padding:0 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="height:1px;background:${CARD_BORDER};line-height:0;font-size:0;">&nbsp;</td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Disclaimer -->
            <tr>
              <td style="padding:18px 32px 24px;">
                <p style="margin:0;font-size:12px;line-height:1.55;color:${MUTED_2};text-align:center;">
                  ${escape(p.disclaimer)}
                </p>
              </td>
            </tr>
          </table>

          <!-- Footer -->
          <p style="margin:18px 0 0;font-size:11px;color:${MUTED_2};font-family:Inter,-apple-system,sans-serif;text-align:center;">
            Controle de Caixa · controle financeiro do seu negócio
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderEmailText(p: RenderParams): string {
  const lines: string[] = [];
  lines.push("CONTROLE DE CAIXA");
  lines.push(p.eyebrow);
  lines.push("");
  lines.push(p.greeting);
  lines.push("");
  lines.push(p.intro);
  lines.push("");
  for (const b of p.blocks) {
    lines.push(b.title);
    if (b.kind === "list") {
      for (const it of b.items) lines.push(`  - ${it}`);
    } else if (b.kind === "warning" || b.kind === "section") {
      if (b.body) lines.push(b.body);
    }
    lines.push("");
  }
  lines.push(`${p.cta.label}: ${p.cta.href}`);
  lines.push("");
  lines.push("─────────────────");
  lines.push(p.disclaimer);
  return lines.join("\n");
}

/** Suffix consistente do subject pra refletir o padrão do magic link. */
export const SUBJECT_PREFIX = "Controle de Caixa • ";
