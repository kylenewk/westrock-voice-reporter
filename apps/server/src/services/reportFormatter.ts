import type { StructuredReport } from "../types/report.js";

/**
 * Generates a professionally styled HTML report suitable for HubSpot notes
 * and executive review by the Chief Commercial Officer.
 */
export function formatReportHtml(report: StructuredReport): string {
  const sentimentColors: Record<string, string> = {
    positive: "#00b894",
    neutral: "#0984e3",
    negative: "#d63031",
    mixed: "#e17055",
  };

  const sampleStatusColors: Record<string, string> = {
    approved: "#00b894",
    rejected: "#d63031",
    "under review": "#e17055",
    sent: "#0f3460",
    requested: "#0984e3",
    "not discussed": "#b2bec3",
  };

  const callTypeLabels: Record<string, string> = {
    phone: "Phone Call",
    "in-person": "In-Person Meeting",
    video: "Video Call",
  };

  const businessTypeLabels: Record<string, string> = {
    new: "New Business",
    "competitive switch": "Competitive Switch",
    expansion: "Account Expansion",
    renewal: "Renewal",
  };

  const sentimentColor = sentimentColors[report.customerSentiment] ?? "#b2bec3";
  const callTypeLabel = callTypeLabels[report.callType] ?? esc(report.callType);
  const businessTypeLabel =
    report.businessType && report.businessType !== "not discussed"
      ? businessTypeLabels[report.businessType] ?? esc(report.businessType)
      : null;

  function badge(text: string, color: string): string {
    return `<span style="display:inline-block;padding:3px 10px;border-radius:12px;background:${color};color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">${esc(text)}</span>`;
  }

  function sectionTitle(title: string): string {
    return `<h3 style="margin:24px 0 12px 0;padding-bottom:6px;border-bottom:2px solid #eee;color:#1a1a2e;font-size:15px;font-weight:700;letter-spacing:0.3px;">${title}</h3>`;
  }

  // ── Attendees
  const attendeeHtml = (report.attendees || []).length > 0
    ? (report.attendees || [])
        .map(
          (a) =>
            `<span style="display:inline-block;margin:3px 6px 3px 0;padding:6px 12px;background:#f8f9fa;border:1px solid #eee;border-radius:8px;font-size:13px;"><strong>${esc(a.name)}</strong> <span style="color:#636e72;">— ${esc(a.title)}${a.company ? `, ${esc(a.company)}` : ""}</span></span>`
        )
        .join("\n")
    : "";

  // ── Products table
  const productsHtml = (report.productsDiscussed || []).length > 0
    ? `${sectionTitle("☕ Products Discussed")}
<table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
  <tr style="background:#f8f9fa;">
    <th style="text-align:left;padding:10px 12px;border-bottom:2px solid #dfe6e9;color:#1a1a2e;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Category</th>
    <th style="text-align:left;padding:10px 12px;border-bottom:2px solid #dfe6e9;color:#1a1a2e;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Details</th>
    <th style="text-align:center;padding:10px 12px;border-bottom:2px solid #dfe6e9;color:#1a1a2e;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Sample Status</th>
    <th style="text-align:center;padding:10px 12px;border-bottom:2px solid #dfe6e9;color:#1a1a2e;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Custom</th>
  </tr>
  ${(report.productsDiscussed || [])
    .map(
      (p) =>
        `<tr>
    <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-weight:600;color:#1a1a2e;font-size:13px;">${esc(p.category)}</td>
    <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#2d3436;">${esc(p.details)}</td>
    <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${p.sampleStatus !== "not discussed" ? badge(p.sampleStatus, sampleStatusColors[p.sampleStatus] ?? "#b2bec3") : "<span style='color:#b2bec3;font-size:12px;'>—</span>"}</td>
    <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:13px;">${p.customFormulation ? "✓" : "—"}</td>
  </tr>`
    )
    .join("\n")}
</table>`
    : "";

  // ── Key Insights
  const insightsHtml = (report.keyInsights || []).length > 0
    ? `${sectionTitle("💡 Key Insights")}
${(report.keyInsights || [])
  .map(
    (ins, i) =>
      `<div style="display:flex;margin-bottom:8px;padding:12px 14px;background:#f0f4ff;border-radius:8px;border-left:3px solid #0f3460;">
  <span style="display:inline-block;min-width:24px;height:24px;line-height:24px;text-align:center;border-radius:12px;background:#0f3460;color:#fff;font-size:11px;font-weight:700;margin-right:12px;">${i + 1}</span>
  <span style="font-size:13px;line-height:20px;color:#2d3436;">${esc(ins)}</span>
</div>`
  )
  .join("\n")}`
    : "";

  // ── Action Items
  const actionsHtml = (report.actionItems || []).length > 0
    ? `${sectionTitle("✅ Action Items")}
<table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
  <tr style="background:#f8f9fa;">
    <th style="text-align:center;padding:10px 8px;border-bottom:2px solid #dfe6e9;color:#1a1a2e;font-size:12px;font-weight:700;width:30px;">#</th>
    <th style="text-align:left;padding:10px 12px;border-bottom:2px solid #dfe6e9;color:#1a1a2e;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Action</th>
    <th style="text-align:left;padding:10px 12px;border-bottom:2px solid #dfe6e9;color:#1a1a2e;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Owner</th>
    <th style="text-align:left;padding:10px 12px;border-bottom:2px solid #dfe6e9;color:#1a1a2e;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Due Date</th>
  </tr>
  ${(report.actionItems || [])
    .map(
      (a, i) =>
        `<tr>
    <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;text-align:center;font-weight:700;color:#00b894;">${i + 1}</td>
    <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#2d3436;">${esc(a.action)}</td>
    <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#636e72;font-weight:600;">${esc(a.owner)}</td>
    <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#0f3460;font-weight:600;">${a.dueDate || "TBD"}</td>
  </tr>`
    )
    .join("\n")}
</table>`
    : "";

  // ── Next Steps
  const nextStepsHtml = (report.nextSteps || []).length > 0
    ? `${sectionTitle("➡️ Next Steps")}
<ul style="margin:0;padding-left:0;list-style:none;">
  ${(report.nextSteps || [])
    .map(
      (n) =>
        `<li style="margin-bottom:8px;padding:10px 14px;background:#f8f9fa;border-radius:8px;border-left:3px solid #0f3460;">
    <strong style="font-size:13px;color:#2d3436;">${esc(n.step)}</strong>
    <br/><span style="font-size:12px;color:#636e72;">Timeline: ${esc(n.timeline)}</span>
  </li>`
    )
    .join("\n")}
</ul>`
    : "";

  // ── Competitor Intelligence
  const competitorHtml =
    report.competitorMentions && report.competitorMentions.length > 0
      ? `${sectionTitle("🔍 Competitor Intelligence")}
${report.competitorMentions
  .map(
    (c) =>
      `<div style="margin-bottom:8px;padding:12px 14px;background:#fff;border-radius:8px;border:1px solid #eee;border-left:3px solid #e17055;">
  <strong style="font-size:13px;color:#1a1a2e;">${esc(c.competitor)}</strong>
  <p style="margin:4px 0 0 0;font-size:13px;color:#2d3436;line-height:19px;">${esc(c.context)}</p>
</div>`
  )
  .join("\n")}`
      : "";

  // ── Decision Process
  const decisionHtml = report.decisionProcess
    ? `${sectionTitle("🎯 Decision Process")}
<div style="padding:14px;background:#f8f9fa;border-radius:8px;border:1px solid #eee;">
  ${report.decisionProcess.decisionMaker ? `<div style="margin-bottom:10px;"><span style="font-size:11px;font-weight:700;color:#636e72;text-transform:uppercase;letter-spacing:0.5px;">Decision Maker</span><br/><span style="font-size:13px;color:#2d3436;">${esc(report.decisionProcess.decisionMaker)}</span></div>` : ""}
  ${report.decisionProcess.decisionTimeline ? `<div style="margin-bottom:10px;"><span style="font-size:11px;font-weight:700;color:#636e72;text-transform:uppercase;letter-spacing:0.5px;">Timeline</span><br/><span style="font-size:13px;color:#2d3436;">${esc(report.decisionProcess.decisionTimeline)}</span></div>` : ""}
  ${(report.decisionProcess.evaluationCriteria || []).length > 0 ? `<div style="margin-bottom:10px;"><span style="font-size:11px;font-weight:700;color:#636e72;text-transform:uppercase;letter-spacing:0.5px;">Evaluation Criteria</span><br/><span style="font-size:13px;color:#2d3436;">${report.decisionProcess.evaluationCriteria.map(esc).join(", ")}</span></div>` : ""}
  ${(report.decisionProcess.otherStakeholders || []).length > 0 ? `<div><span style="font-size:11px;font-weight:700;color:#636e72;text-transform:uppercase;letter-spacing:0.5px;">Other Stakeholders</span><br/><span style="font-size:13px;color:#2d3436;">${report.decisionProcess.otherStakeholders.map(esc).join(", ")}</span></div>` : ""}
</div>`
    : "";

  // ── Risk Factors
  const riskHtml = (report.riskFactors || []).length > 0
    ? `${sectionTitle("⚠️ Risk Factors")}
${(report.riskFactors || [])
  .map(
    (r) =>
      `<div style="margin-bottom:8px;padding:12px 14px;background:#fff5f5;border-radius:8px;border-left:3px solid #d63031;">
  <span style="font-size:13px;color:#2d3436;line-height:19px;">${esc(r)}</span>
</div>`
  )
  .join("\n")}`
    : "";

  // ── Pricing / Volume
  const pricingHtml = report.pricingNotes
    ? `<div style="margin-bottom:10px;"><span style="font-size:11px;font-weight:700;color:#636e72;text-transform:uppercase;letter-spacing:0.5px;">Pricing</span><br/><span style="font-size:13px;color:#2d3436;line-height:19px;">${esc(report.pricingNotes)}</span></div>`
    : "";
  const volumeHtml = report.volumeNotes
    ? `<div><span style="font-size:11px;font-weight:700;color:#636e72;text-transform:uppercase;letter-spacing:0.5px;">Volume</span><br/><span style="font-size:13px;color:#2d3436;line-height:19px;">${esc(report.volumeNotes)}</span></div>`
    : "";
  const pvSection =
    pricingHtml || volumeHtml
      ? `${sectionTitle("💰 Pricing & Volume")}
<div style="padding:14px;background:#f8f9fa;border-radius:8px;border:1px solid #eee;">
  ${pricingHtml}
  ${volumeHtml}
</div>`
      : "";

  // ── Topics
  const topicsHtml = (report.topicsDiscussed || []).length > 0
    ? `${sectionTitle("💬 Topics Discussed")}
<div style="display:flex;flex-wrap:wrap;gap:6px;">
  ${(report.topicsDiscussed || [])
    .map(
      (t) =>
        `<span style="display:inline-block;padding:4px 12px;background:#1a1a2e10;border-radius:16px;font-size:12px;color:#1a1a2e;margin:3px 4px 3px 0;border:1px solid #eee;">${esc(t)}</span>`
    )
    .join("\n")}
</div>`
    : "";

  // ── Deal Stage
  const stageHtml = report.dealStageRecommendation
    ? `${sectionTitle("📊 Deal Stage Assessment")}
<div style="padding:14px;background:#f8f9fa;border-radius:8px;border:1px solid #eee;text-align:center;">
  <span style="display:inline-block;padding:8px 16px;background:#fff;border:1px solid #ddd;border-radius:8px;font-size:13px;font-weight:700;color:#1a1a2e;">${esc(report.dealStageRecommendation.currentStage)}</span>
  <span style="display:inline-block;margin:0 12px;font-size:18px;color:#636e72;">→</span>
  <span style="display:inline-block;padding:8px 16px;background:${report.dealStageRecommendation.recommendedStage !== report.dealStageRecommendation.currentStage ? "#00b89415" : "#fff"};border:1px solid ${report.dealStageRecommendation.recommendedStage !== report.dealStageRecommendation.currentStage ? "#00b894" : "#ddd"};border-radius:8px;font-size:13px;font-weight:700;color:${report.dealStageRecommendation.recommendedStage !== report.dealStageRecommendation.currentStage ? "#00b894" : "#1a1a2e"};">${esc(report.dealStageRecommendation.recommendedStage)}</span>
  <p style="margin:12px 0 0 0;font-size:13px;color:#636e72;font-style:italic;">${esc(report.dealStageRecommendation.rationale)}</p>
</div>`
    : "";

  // ── Follow-Up
  const followUpHtml = report.followUpDate
    ? `<div style="margin-top:20px;padding:14px;background:#0f346010;border-radius:8px;display:flex;align-items:center;">
  <span style="font-size:24px;margin-right:12px;">📅</span>
  <div>
    <span style="font-size:11px;font-weight:700;color:#636e72;text-transform:uppercase;letter-spacing:0.5px;">Next Follow-Up</span><br/>
    <span style="font-size:14px;font-weight:700;color:#0f3460;">${esc(report.followUpDate)}</span>
  </div>
</div>`
    : "";

  // ── Assemble the complete report
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:700px;margin:0 auto;color:#2d3436;">

<!-- Header -->
<div style="background:#1a1a2e;border-radius:10px;padding:20px 24px;margin-bottom:16px;">
  <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.5);letter-spacing:2px;margin-bottom:4px;">WESTROCK COFFEE</div>
  <div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:12px;">Sales Call Report</div>
  <div style="font-size:13px;color:rgba(255,255,255,0.7);">
    ${esc(report.callDate)} &nbsp;·&nbsp; ${callTypeLabel}${businessTypeLabel ? ` &nbsp;·&nbsp; ${businessTypeLabel}` : ""}
    &nbsp;&nbsp;${badge(report.customerSentiment, sentimentColor)}
  </div>
</div>

<!-- Executive Summary -->
<div style="background:#f0f4ff;border-radius:10px;padding:18px 20px;margin-bottom:20px;border-left:4px solid #0f3460;">
  <div style="font-size:11px;font-weight:700;color:#0f3460;letter-spacing:1.5px;margin-bottom:8px;">EXECUTIVE SUMMARY</div>
  <p style="margin:0;font-size:14px;line-height:22px;color:#2d3436;">${esc(report.summary)}</p>
</div>

<!-- Attendees -->
${attendeeHtml ? `${sectionTitle("👥 Attendees")}\n<div>${attendeeHtml}</div>` : ""}

${insightsHtml}

${productsHtml}

${actionsHtml}

${nextStepsHtml}

${competitorHtml}

${decisionHtml}

${riskHtml}

${pvSection}

${topicsHtml}

${stageHtml}

${followUpHtml}

<!-- Footer -->
<div style="margin-top:28px;padding-top:12px;border-top:1px solid #eee;text-align:center;">
  <span style="font-size:11px;color:#b2bec3;">Generated by Westrock Voice Reporter &nbsp;·&nbsp; AI-Assisted &nbsp;·&nbsp; ${new Date().toISOString().split("T")[0]}</span>
</div>

</div>`;
}

/**
 * Plain text version for email or non-HTML contexts.
 */
export function formatReportPlainText(report: StructuredReport): string {
  const lines: string[] = [];

  const callTypeLabels: Record<string, string> = {
    phone: "Phone Call",
    "in-person": "In-Person Meeting",
    video: "Video Call",
  };

  const businessTypeLabels: Record<string, string> = {
    new: "New Business",
    "competitive switch": "Competitive Switch",
    expansion: "Account Expansion",
    renewal: "Renewal",
  };

  lines.push("═══════════════════════════════════════════════════");
  lines.push("  WESTROCK COFFEE — SALES CALL REPORT");
  lines.push("═══════════════════════════════════════════════════");
  lines.push("");
  lines.push(`Date:       ${safe(report.callDate)}`);
  lines.push(`Type:       ${callTypeLabels[report.callType] ?? safe(report.callType)}`);
  lines.push(`Sentiment:  ${safe(report.customerSentiment)}`);
  if (report.businessType && report.businessType !== "not discussed") {
    lines.push(`Category:   ${businessTypeLabels[report.businessType] ?? safe(report.businessType)}`);
  }
  lines.push("");

  lines.push("───────────────────────────────────────────────────");
  lines.push("  EXECUTIVE SUMMARY");
  lines.push("───────────────────────────────────────────────────");
  lines.push(`  ${safe(report.summary)}`);
  lines.push("");

  if ((report.attendees || []).length > 0) {
    lines.push("ATTENDEES:");
    for (const a of report.attendees) {
      lines.push(`  • ${safe(a.name)}, ${safe(a.title)} (${safe(a.company)})`);
    }
    lines.push("");
  }

  if ((report.keyInsights || []).length > 0) {
    lines.push("KEY INSIGHTS:");
    report.keyInsights.forEach((ins, i) => {
      lines.push(`  ${i + 1}. ${safe(ins)}`);
    });
    lines.push("");
  }

  if ((report.productsDiscussed || []).length > 0) {
    lines.push("PRODUCTS DISCUSSED:");
    for (const p of report.productsDiscussed) {
      lines.push(`  • ${safe(p.category)}: ${safe(p.details)}`);
      lines.push(`    Samples: ${safe(p.sampleStatus)} | Custom: ${p.customFormulation ? "Yes" : "No"}`);
    }
    lines.push("");
  }

  if ((report.actionItems || []).length > 0) {
    lines.push("ACTION ITEMS:");
    report.actionItems.forEach((a, i) => {
      lines.push(`  ${i + 1}. ${safe(a.action)}`);
      lines.push(`     Owner: ${safe(a.owner)} | Due: ${a.dueDate || "TBD"}`);
    });
    lines.push("");
  }

  if ((report.nextSteps || []).length > 0) {
    lines.push("NEXT STEPS:");
    for (const n of report.nextSteps) {
      lines.push(`  → ${safe(n.step)} (${safe(n.timeline)})`);
    }
    lines.push("");
  }

  if (report.competitorMentions && report.competitorMentions.length > 0) {
    lines.push("COMPETITOR INTELLIGENCE:");
    for (const c of report.competitorMentions) {
      lines.push(`  • ${safe(c.competitor)}: ${safe(c.context)}`);
    }
    lines.push("");
  }

  if (report.decisionProcess) {
    lines.push("DECISION PROCESS:");
    if (report.decisionProcess.decisionMaker) {
      lines.push(`  Decision Maker: ${safe(report.decisionProcess.decisionMaker)}`);
    }
    if (report.decisionProcess.decisionTimeline) {
      lines.push(`  Timeline: ${safe(report.decisionProcess.decisionTimeline)}`);
    }
    if ((report.decisionProcess.evaluationCriteria || []).length > 0) {
      lines.push(`  Criteria: ${report.decisionProcess.evaluationCriteria.map(safe).join(", ")}`);
    }
    if ((report.decisionProcess.otherStakeholders || []).length > 0) {
      lines.push(`  Stakeholders: ${report.decisionProcess.otherStakeholders.map(safe).join(", ")}`);
    }
    lines.push("");
  }

  if ((report.riskFactors || []).length > 0) {
    lines.push("⚠ RISK FACTORS:");
    for (const r of report.riskFactors) {
      lines.push(`  • ${safe(r)}`);
    }
    lines.push("");
  }

  if (report.pricingNotes) {
    lines.push(`PRICING: ${report.pricingNotes}`);
  }
  if (report.volumeNotes) {
    lines.push(`VOLUME: ${report.volumeNotes}`);
  }
  if (report.pricingNotes || report.volumeNotes) lines.push("");

  if ((report.topicsDiscussed || []).length > 0) {
    lines.push(`TOPICS: ${(report.topicsDiscussed || []).map(safe).join(", ")}`);
    lines.push("");
  }

  const dsr = report.dealStageRecommendation;
  if (dsr) {
    lines.push(`DEAL STAGE: ${safe(dsr.currentStage)} → ${safe(dsr.recommendedStage)}`);
    lines.push(`  ${safe(dsr.rationale)}`);
    lines.push("");
  }

  if (report.followUpDate) {
    lines.push(`NEXT FOLLOW-UP: ${report.followUpDate}`);
    lines.push("");
  }

  lines.push("───────────────────────────────────────────────────");
  lines.push("  Generated by Westrock Voice Reporter · AI-Assisted");
  lines.push("═══════════════════════════════════════════════════");

  return lines.join("\n");
}

function esc(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Safely convert any value to a string (guards against null/undefined from AI output) */
function safe(val: unknown): string {
  if (val == null) return "";
  return String(val);
}
