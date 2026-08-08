import { decisionFor } from "@/lib/trust/decision";
import { getSkillDetail } from "@/lib/skills";

/**
 * Embeddable SVG badge for a skill's current decision.
 *
 * Rendered here rather than proxied through a third-party badge service so the
 * value cannot be spoofed by URL parameters — the text always comes from the
 * skill's latest scan.
 */

const COLOR: Record<string, string> = {
  pass: "#1f7a6c",
  block: "#d92d20",
  progress: "#b54708",
  unknown: "#667085",
};

const LABEL = "skillsigil";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Verdana at 11px averages ~6.6px per character; pad for the end caps. */
function textWidth(text: string) {
  return Math.ceil(text.length * 6.6) + 20;
}

function renderBadge(message: string, color: string) {
  const labelWidth = textWidth(LABEL);
  const messageWidth = textWidth(message);
  const total = labelWidth + messageWidth;
  const label = escapeXml(LABEL);
  const value = escapeXml(message);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="20" role="img" aria-label="${label}: ${value}">
<title>${label}: ${value}</title>
<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".1" stop-color="#aaa" stop-opacity=".1"/><stop offset=".9" stop-color="#000" stop-opacity=".3"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient>
<clipPath id="r"><rect width="${total}" height="20" rx="3" fill="#fff"/></clipPath>
<g clip-path="url(#r)">
<rect width="${labelWidth}" height="20" fill="#24292f"/>
<rect x="${labelWidth}" width="${messageWidth}" height="20" fill="${color}"/>
<rect width="${total}" height="20" fill="url(#s)"/>
</g>
<g fill="#fff" text-anchor="middle" font-family="Verdana,DejaVu Sans,Geneva,sans-serif" font-size="11">
<text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
<text x="${labelWidth / 2}" y="14">${label}</text>
<text x="${labelWidth + messageWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
<text x="${labelWidth + messageWidth / 2}" y="14">${value}</text>
</g>
</svg>`;
}

function svgResponse(body: string, cacheSeconds: number) {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Short cache: a badge that lags a revoked decision is worse than a slow one.
      "Cache-Control": `public, max-age=${cacheSeconds}, stale-while-revalidate=300`,
    },
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  let skill;
  try {
    skill = await getSkillDetail(slug.replace(/\.svg$/, ""));
  } catch {
    return svgResponse(renderBadge("unavailable", COLOR.unknown), 30);
  }

  if (!skill) {
    return svgResponse(renderBadge("not listed", COLOR.unknown), 300);
  }

  const decision = decisionFor(skill.status);
  const message =
    decision.tone === "pass"
      ? skill.counts.total === 0
        ? "scan passed"
        : `passed · ${skill.counts.total} noted`
      : decision.tone === "block"
        ? `${decision.label.toLowerCase()} · ${skill.counts.total} finding${skill.counts.total === 1 ? "" : "s"}`
        : decision.label.toLowerCase();

  return svgResponse(renderBadge(message, COLOR[decision.tone]), 120);
}
