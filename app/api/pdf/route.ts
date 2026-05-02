import { NextResponse } from "next/server"
import chromium from "@sparticuz/chromium"
import puppeteer from "puppeteer-core"
import type { AuditResult } from "@/lib/audit-data"

export const runtime = "nodejs"
export const maxDuration = 60
export const dynamic = "force-dynamic"

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function scoreColor(score: number): string {
  if (score >= 70) return "#22c55e"
  if (score >= 40) return "#f59e0b"
  return "#ef4444"
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

function buildHtml(result: AuditResult): string {
  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

  const heroColor = scoreColor(result.totalScore)

  const fontStack =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', Arial, sans-serif"

  const dimensionsHtml = result.dimensions
    .map((d) => {
      const pct = Math.max(0, Math.min(100, (d.score / d.max) * 100))
      const barColor = scoreColor((d.score / d.max) * 100)
      return `
        <div style="margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
            <div>
              <div style="color: #fafafa; font-size: 14px; font-weight: 600;">${escapeHtml(d.label)}</div>
              <div style="color: #a1a1aa; font-size: 11px; margin-top: 2px;">${escapeHtml(d.description)}</div>
            </div>
            <div style="color: #fafafa; font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; padding-left: 16px;">
              ${d.score} <span style="color: #71717a; font-weight: 400;">/ ${d.max}</span>
            </div>
          </div>
          <div style="height: 6px; width: 100%; background: #27272a; border-radius: 999px; overflow: hidden;">
            <div style="height: 100%; width: ${pct}%; background: ${barColor}; border-radius: 999px;"></div>
          </div>
        </div>
      `
    })
    .join("")

  const quickWinsHtml = result.quickWins
    .slice(0, 3)
    .map(
      (w, i) => `
        <div style="display: flex; gap: 14px; padding: 16px; border: 1px solid #27272a; border-radius: 12px; background: #18181b; margin-bottom: 10px;">
          <div style="flex-shrink: 0; width: 28px; height: 28px; border-radius: 999px; background: #f59e0b; color: #09090b; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px;">
            ${i + 1}
          </div>
          <div style="flex: 1;">
            <div style="color: #fafafa; font-size: 14px; font-weight: 600; margin-bottom: 6px;">${escapeHtml(w.title)}</div>
            <div style="color: #d4d4d8; font-size: 12px; line-height: 1.5; margin-bottom: 10px;">${escapeHtml(w.description)}</div>
            <div style="display: flex; gap: 8px;">
              <span style="font-size: 11px; padding: 3px 8px; border-radius: 6px; background: #27272a; color: #a1a1aa;">${escapeHtml(w.time)}</span>
              <span style="font-size: 11px; padding: 3px 8px; border-radius: 6px; background: rgba(34, 197, 94, 0.15); color: #4ade80;">${escapeHtml(w.impact)}</span>
            </div>
          </div>
        </div>
      `,
    )
    .join("")

  const narrativeHtml = result.narrative
    .filter((p) => !p.startsWith("#"))
    .slice(0, 3)
    .map(
      (p) =>
        `<p style="color: #d4d4d8; font-size: 12px; line-height: 1.65; margin: 0 0 12px 0;">${escapeHtml(
          p.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1"),
        )}</p>`,
    )
    .join("")

  const competitorsHtml = result.competitors
    .map((c) => {
      const isYou = c.isYou
      const rowBg = isYou ? "background: rgba(245, 158, 11, 0.08);" : ""
      const nameStyle = isYou ? "color: #f59e0b; font-weight: 700;" : "color: #fafafa; font-weight: 500;"
      return `
        <tr style="${rowBg}">
          <td style="padding: 10px 12px; border-bottom: 1px solid #27272a; font-size: 12px; ${nameStyle}">
            ${escapeHtml(c.name)}${isYou ? ' <span style="font-size: 10px; color: #a1a1aa; font-weight: 400;">(you)</span>' : ""}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #27272a; font-size: 12px; color: #fafafa; text-align: right; font-variant-numeric: tabular-nums;">${c.score}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #27272a; font-size: 12px; color: #d4d4d8; text-align: right; font-variant-numeric: tabular-nums;">${c.gbpPhotos}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #27272a; font-size: 12px; color: #d4d4d8; text-align: right; font-variant-numeric: tabular-nums;">${c.pressMentions}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #27272a; font-size: 13px; text-align: center; color: ${c.bookingLink ? "#4ade80" : "#ef4444"};">${c.bookingLink ? "&#10003;" : "&#10007;"}</td>
        </tr>
      `
    })
    .join("")

  const articlesHtml =
    result.articles && result.articles.length > 0
      ? `
        <div style="margin-top: 28px;">
          <div style="font-family: ${fontStack}; color: #f59e0b; font-size: 10px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 6px;">Press</div>
          <h2 style="color: #fafafa; font-size: 18px; font-weight: 600; margin: 0 0 14px 0;">Recent coverage</h2>
          <div>
            ${result.articles
              .map(
                (a) => `
                  <div style="padding: 10px 0; border-bottom: 1px solid #27272a;">
                    <div style="color: #fafafa; font-size: 12px; font-weight: 500; margin-bottom: 3px;">${escapeHtml(a.title)}</div>
                    <div style="color: #a1a1aa; font-size: 11px;">${escapeHtml(a.source)} &middot; ${escapeHtml(formatDate(a.date))}</div>
                  </div>
                `,
              )
              .join("")}
          </div>
        </div>
      `
      : ""

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>PresenceScore Report - ${escapeHtml(result.restaurantName)}</title>
    <style>
      @page { size: A4; margin: 0; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body {
        font-family: ${fontStack};
        background: #09090b;
        color: #fafafa;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    </style>
  </head>
  <body>
    <div style="background: #09090b; padding: 32px 36px; min-height: 100vh;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 1px solid #27272a;">
        <div>
          <div style="color: #fafafa; font-size: 16px; font-weight: 700; letter-spacing: -0.01em;">PresenceScore</div>
          <div style="color: #71717a; font-size: 10px; margin-top: 2px;">AI audit for London restaurants</div>
        </div>
        <div style="text-align: right;">
          <div style="color: #fafafa; font-size: 13px; font-weight: 600;">${escapeHtml(result.restaurantName)}</div>
          <div style="color: #a1a1aa; font-size: 11px; margin-top: 2px;">${escapeHtml(result.postcode)} &middot; ${escapeHtml(today)}</div>
        </div>
      </div>

      <!-- Score hero -->
      <div style="text-align: center; padding: 36px 0 28px 0; border-bottom: 1px solid #27272a;">
        <div style="color: #71717a; font-size: 10px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; margin-bottom: 12px;">PresenceScore</div>
        <div style="font-size: 84px; font-weight: 700; line-height: 1; color: ${heroColor}; letter-spacing: -0.04em; font-variant-numeric: tabular-nums;">
          ${result.totalScore}
        </div>
        <div style="color: #a1a1aa; font-size: 12px; margin-top: 10px;">out of 100</div>
      </div>

      <!-- Dimensions -->
      <div style="margin-top: 28px;">
        <div style="color: #f59e0b; font-size: 10px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 6px;">Breakdown</div>
        <h2 style="color: #fafafa; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">Score by dimension</h2>
        ${dimensionsHtml}
      </div>

      <!-- Quick wins -->
      <div style="margin-top: 28px; page-break-inside: avoid;">
        <div style="color: #f59e0b; font-size: 10px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 6px;">Action items</div>
        <h2 style="color: #fafafa; font-size: 18px; font-weight: 600; margin: 0 0 14px 0;">Top 3 quick wins</h2>
        ${quickWinsHtml}
      </div>

      <!-- Narrative -->
      <div style="margin-top: 28px;">
        <div style="color: #f59e0b; font-size: 10px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 6px;">Summary</div>
        <h2 style="color: #fafafa; font-size: 18px; font-weight: 600; margin: 0 0 12px 0;">What this means for you</h2>
        <div style="border: 1px solid #27272a; background: #18181b; border-radius: 12px; padding: 18px;">
          ${narrativeHtml}
        </div>
      </div>

      <!-- Competitors -->
      <div style="margin-top: 28px; page-break-inside: avoid;">
        <div style="color: #f59e0b; font-size: 10px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 6px;">Benchmarks</div>
        <h2 style="color: #fafafa; font-size: 18px; font-weight: 600; margin: 0 0 14px 0;">How you compare</h2>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #27272a; border-radius: 12px; overflow: hidden;">
          <thead>
            <tr style="background: #18181b;">
              <th style="padding: 10px 12px; text-align: left; font-size: 10px; font-weight: 600; color: #71717a; letter-spacing: 0.08em; text-transform: uppercase; border-bottom: 1px solid #27272a;">Name</th>
              <th style="padding: 10px 12px; text-align: right; font-size: 10px; font-weight: 600; color: #71717a; letter-spacing: 0.08em; text-transform: uppercase; border-bottom: 1px solid #27272a;">Score</th>
              <th style="padding: 10px 12px; text-align: right; font-size: 10px; font-weight: 600; color: #71717a; letter-spacing: 0.08em; text-transform: uppercase; border-bottom: 1px solid #27272a;">GBP Photos</th>
              <th style="padding: 10px 12px; text-align: right; font-size: 10px; font-weight: 600; color: #71717a; letter-spacing: 0.08em; text-transform: uppercase; border-bottom: 1px solid #27272a;">Press</th>
              <th style="padding: 10px 12px; text-align: center; font-size: 10px; font-weight: 600; color: #71717a; letter-spacing: 0.08em; text-transform: uppercase; border-bottom: 1px solid #27272a;">Booking</th>
            </tr>
          </thead>
          <tbody>
            ${competitorsHtml}
          </tbody>
        </table>
      </div>

      ${articlesHtml}

      <!-- Footer -->
      <div style="margin-top: 36px; padding-top: 16px; border-top: 1px solid #27272a; text-align: center;">
        <div style="color: #71717a; font-size: 10px;">Generated by PresenceScore &middot; presencescore.co</div>
      </div>
    </div>
  </body>
</html>`
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { result?: AuditResult }
    const result = body?.result

    if (!result || !result.restaurantName) {
      return NextResponse.json(
        { error: "Missing or invalid 'result' payload" },
        { status: 400 },
      )
    }

    const html = buildHtml(result)

    // Vercel strips the local bin/ directory (too large for Lambda).
    // Pass the release URL so chromium downloads to /tmp and caches across warm invocations.
    const executablePath = await chromium.executablePath(
      "https://github.com/Sparticuz/chromium/releases/download/v148.0.0/chromium-v148.0.0-pack.tar",
    )

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    })

    try {
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: "networkidle0" })

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      })

      const safeName = result.restaurantName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")

      return new Response(pdfBuffer as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="presencescore-${safeName || "report"}.pdf"`,
          "Cache-Control": "no-store",
        },
      })
    } finally {
      await browser.close()
    }
  } catch (err) {
    console.error("[v0] PDF generation failed:", err)
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 },
    )
  }
}
