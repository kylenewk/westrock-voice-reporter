import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { COLORS } from "../constants/config";
import type { StructuredReport } from "../types";

interface ReportViewProps {
  report: StructuredReport;
}

/* ───── small helpers ───── */

function SectionHeader({ title, icon }: { title: string; icon?: string }) {
  return (
    <View style={styles.sectionHeaderWrap}>
      {icon ? <Text style={styles.sectionIcon}>{icon}</Text> : null}
      <Text style={styles.sectionHeader}>{title}</Text>
    </View>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const sentimentColors: Record<string, string> = {
  positive: "#00b894",
  neutral: "#0984e3",
  negative: "#d63031",
  mixed: "#e17055",
};

const sampleStatusColors: Record<string, string> = {
  approved: "#00b894",
  rejected: "#d63031",
  "under review": "#fdcb6e",
  sent: "#0f3460",
  requested: "#0984e3",
  "not discussed": "#b2bec3",
};

const sentimentLabels: Record<string, string> = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
  mixed: "Mixed",
};

const callTypeLabels: Record<string, string> = {
  phone: "Phone Call",
  "in-person": "In-Person",
  video: "Video Call",
};

const businessTypeLabels: Record<string, string> = {
  new: "New Business",
  "competitive switch": "Competitive Switch",
  expansion: "Account Expansion",
  renewal: "Renewal",
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/* ───── main component ───── */

export function ReportView({ report }: ReportViewProps) {
  const hasProducts = (report.productsDiscussed || []).length > 0;
  const hasTopics = (report.topicsDiscussed || []).length > 0;
  const hasInsights = (report.keyInsights || []).length > 0;
  const hasActions = (report.actionItems || []).length > 0;
  const hasNextSteps = (report.nextSteps || []).length > 0;
  const hasCompetitors = (report.competitorMentions || []).length > 0;
  const hasDecision = !!report.decisionProcess;
  const hasRisks = (report.riskFactors || []).length > 0;
  const hasPricingVolume = !!report.pricingNotes || !!report.volumeNotes;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── Branded Header ── */}
      <View style={styles.reportHeader}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.brandName}>WESTROCK COFFEE</Text>
            <Text style={styles.reportTitle}>Sales Call Report</Text>
          </View>
          <Badge
            text={sentimentLabels[report.customerSentiment] ?? report.customerSentiment}
            color={sentimentColors[report.customerSentiment] ?? "#b2bec3"}
          />
        </View>
        <View style={styles.headerMeta}>
          <Text style={styles.metaText}>
            {formatDate(report.callDate)}
          </Text>
          <Text style={styles.metaDot}>  ·  </Text>
          <Text style={styles.metaText}>
            {callTypeLabels[report.callType] ?? report.callType}
          </Text>
          {report.businessType && report.businessType !== "not discussed" && (
            <>
              <Text style={styles.metaDot}>  ·  </Text>
              <Text style={styles.metaText}>
                {businessTypeLabels[report.businessType] ?? report.businessType}
              </Text>
            </>
          )}
        </View>
      </View>

      {/* ── Executive Summary ── */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>EXECUTIVE SUMMARY</Text>
        <Text style={styles.summaryText}>{report.summary}</Text>
      </View>

      {/* ── Attendees ── */}
      {(report.attendees || []).length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Attendees" icon="👥" />
          <View style={styles.attendeeGrid}>
            {report.attendees.map((a, i) => (
              <View key={i} style={styles.attendeeChip}>
                <Text style={styles.attendeeName}>{a.name}</Text>
                <Text style={styles.attendeeRole}>
                  {a.title}{a.company ? ` · ${a.company}` : ""}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── Key Insights (high priority for CCO) ── */}
      {hasInsights && (
        <View style={styles.section}>
          <SectionHeader title="Key Insights" icon="💡" />
          {report.keyInsights.map((ins, i) => (
            <View key={i} style={styles.insightCard}>
              <View style={styles.insightBullet}>
                <Text style={styles.insightBulletText}>{i + 1}</Text>
              </View>
              <Text style={styles.insightText}>{ins}</Text>
            </View>
          ))}
        </View>
      )}

      <Divider />

      {/* ── Products Discussed ── */}
      {hasProducts && (
        <View style={styles.section}>
          <SectionHeader title="Products Discussed" icon="☕" />
          {report.productsDiscussed.map((p, i) => (
            <View key={i} style={styles.productCard}>
              <View style={styles.productHeader}>
                <Text style={styles.productCategory}>{p.category}</Text>
                {p.sampleStatus && p.sampleStatus !== "not discussed" && (
                  <Badge
                    text={p.sampleStatus}
                    color={sampleStatusColors[p.sampleStatus] ?? "#b2bec3"}
                  />
                )}
              </View>
              <Text style={styles.productDetails}>{p.details}</Text>
              {p.customFormulation && (
                <View style={styles.customBadge}>
                  <Text style={styles.customBadgeText}>Custom Formulation</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* ── Action Items ── */}
      {hasActions && (
        <View style={styles.section}>
          <SectionHeader title="Action Items" icon="✅" />
          {report.actionItems.map((ai, i) => (
            <View key={i} style={styles.actionCard}>
              <View style={styles.actionNumber}>
                <Text style={styles.actionNumberText}>{i + 1}</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionText}>{ai.action}</Text>
                <View style={styles.actionMetaRow}>
                  <Text style={styles.actionOwner}>{ai.owner}</Text>
                  {ai.dueDate && (
                    <Text style={styles.actionDue}>Due: {ai.dueDate}</Text>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── Next Steps ── */}
      {hasNextSteps && (
        <View style={styles.section}>
          <SectionHeader title="Next Steps" icon="➡️" />
          {report.nextSteps.map((ns, i) => (
            <View key={i} style={styles.nextStepRow}>
              <View style={styles.timelineDot} />
              <View style={styles.nextStepContent}>
                <Text style={styles.nextStepText}>{ns.step}</Text>
                <Text style={styles.nextStepTimeline}>{ns.timeline}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <Divider />

      {/* ── Decision Process ── */}
      {hasDecision && (
        <View style={styles.section}>
          <SectionHeader title="Decision Process" icon="🎯" />
          <View style={styles.decisionCard}>
            {report.decisionProcess?.decisionMaker && (
              <InfoRow label="Decision Maker" value={report.decisionProcess.decisionMaker} />
            )}
            {report.decisionProcess?.decisionTimeline && (
              <InfoRow label="Timeline" value={report.decisionProcess.decisionTimeline} />
            )}
            {(report.decisionProcess?.evaluationCriteria || []).length > 0 && (
              <InfoRow
                label="Evaluation Criteria"
                value={report.decisionProcess!.evaluationCriteria.join(", ")}
              />
            )}
            {(report.decisionProcess?.otherStakeholders || []).length > 0 && (
              <InfoRow
                label="Stakeholders"
                value={report.decisionProcess!.otherStakeholders.join(", ")}
              />
            )}
          </View>
        </View>
      )}

      {/* ── Competitor Intelligence ── */}
      {hasCompetitors && (
        <View style={styles.section}>
          <SectionHeader title="Competitor Intelligence" icon="🔍" />
          {report.competitorMentions!.map((cm, i) => (
            <View key={i} style={styles.competitorCard}>
              <Text style={styles.competitorName}>{cm.competitor}</Text>
              <Text style={styles.competitorContext}>{cm.context}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Risk Factors ── */}
      {hasRisks && (
        <View style={styles.section}>
          <SectionHeader title="Risk Factors" icon="⚠️" />
          {report.riskFactors.map((risk, i) => (
            <View key={i} style={styles.riskCard}>
              <Text style={styles.riskText}>{risk}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Pricing & Volume ── */}
      {hasPricingVolume && (
        <View style={styles.section}>
          <SectionHeader title="Pricing & Volume" icon="💰" />
          <View style={styles.pvCard}>
            {report.pricingNotes && (
              <View style={styles.pvRow}>
                <Text style={styles.pvLabel}>Pricing</Text>
                <Text style={styles.pvValue}>{report.pricingNotes}</Text>
              </View>
            )}
            {report.volumeNotes && (
              <View style={styles.pvRow}>
                <Text style={styles.pvLabel}>Volume</Text>
                <Text style={styles.pvValue}>{report.volumeNotes}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ── Topics Discussed ── */}
      {hasTopics && (
        <View style={styles.section}>
          <SectionHeader title="Topics Discussed" icon="💬" />
          <View style={styles.topicWrap}>
            {report.topicsDiscussed.map((t, i) => (
              <View key={i} style={styles.topicChip}>
                <Text style={styles.topicText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── Deal Stage Recommendation ── */}
      {report.dealStageRecommendation && (
        <View style={styles.section}>
          <SectionHeader title="Deal Stage Assessment" icon="📊" />
          <View style={styles.stageCard}>
            <View style={styles.stageFlow}>
              <View style={styles.stageBubble}>
                <Text style={styles.stageSmallLabel}>CURRENT</Text>
                <Text style={styles.stageName}>
                  {report.dealStageRecommendation.currentStage}
                </Text>
              </View>
              <Text style={styles.stageArrow}>→</Text>
              <View
                style={[
                  styles.stageBubble,
                  report.dealStageRecommendation.recommendedStage !==
                    report.dealStageRecommendation.currentStage &&
                    styles.stageBubbleRecommended,
                ]}
              >
                <Text style={styles.stageSmallLabel}>RECOMMENDED</Text>
                <Text
                  style={[
                    styles.stageName,
                    report.dealStageRecommendation.recommendedStage !==
                      report.dealStageRecommendation.currentStage &&
                      styles.stageNameRecommended,
                  ]}
                >
                  {report.dealStageRecommendation.recommendedStage}
                </Text>
              </View>
            </View>
            <Text style={styles.stageRationale}>
              {report.dealStageRecommendation.rationale}
            </Text>
          </View>
        </View>
      )}

      {/* ── Follow-Up ── */}
      {report.followUpDate && (
        <View style={styles.followUpBanner}>
          <Text style={styles.followUpIcon}>📅</Text>
          <View>
            <Text style={styles.followUpLabel}>Next Follow-Up</Text>
            <Text style={styles.followUpDate}>
              {formatDate(report.followUpDate)}
            </Text>
          </View>
        </View>
      )}

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Generated by Westrock Voice Reporter · AI-Assisted
        </Text>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

/* ───── styles ───── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 8,
  },

  /* ── Header ── */
  reportHeader: {
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  brandName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff80",
    letterSpacing: 2,
    marginBottom: 4,
  },
  reportTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  metaText: {
    fontSize: 13,
    color: "#ffffffbb",
  },
  metaDot: {
    fontSize: 13,
    color: "#ffffff50",
  },

  /* ── Executive Summary ── */
  summaryCard: {
    backgroundColor: "#f0f4ff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#0f3460",
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0f3460",
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#2d3436",
  },

  /* ── Badge ── */
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  /* ── Section ── */
  section: {
    marginBottom: 24,
  },
  sectionHeaderWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: "#1a1a2e15",
  },
  sectionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a2e",
    letterSpacing: 0.3,
  },

  divider: {
    height: 1,
    backgroundColor: "#dfe6e9",
    marginVertical: 8,
    marginBottom: 24,
  },

  /* ── Attendees ── */
  attendeeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  attendeeChip: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dfe6e9",
  },
  attendeeName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a2e",
  },
  attendeeRole: {
    fontSize: 12,
    color: "#636e72",
    marginTop: 2,
  },

  /* ── Insights ── */
  insightCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#0f346020",
    alignItems: "flex-start",
  },
  insightBullet: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#0f3460",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 1,
  },
  insightBulletText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: "#2d3436",
  },

  /* ── Products ── */
  productCard: {
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#dfe6e9",
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  productCategory: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a2e",
  },
  productDetails: {
    fontSize: 14,
    lineHeight: 20,
    color: "#2d3436",
  },
  customBadge: {
    alignSelf: "flex-start",
    marginTop: 8,
    backgroundColor: "#0f346015",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  customBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0f3460",
    letterSpacing: 0.3,
  },

  /* ── Action Items ── */
  actionCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#dfe6e9",
    alignItems: "flex-start",
  },
  actionNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#00b894",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 1,
  },
  actionNumberText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  actionContent: {
    flex: 1,
  },
  actionText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#2d3436",
    fontWeight: "500",
  },
  actionMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 12,
  },
  actionOwner: {
    fontSize: 12,
    color: "#636e72",
    fontWeight: "600",
  },
  actionDue: {
    fontSize: 12,
    color: "#0f3460",
    fontWeight: "600",
  },

  /* ── Next Steps ── */
  nextStepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    paddingLeft: 4,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#0f3460",
    marginTop: 6,
    marginRight: 14,
  },
  nextStepContent: {
    flex: 1,
  },
  nextStepText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#2d3436",
    fontWeight: "500",
  },
  nextStepTimeline: {
    fontSize: 12,
    color: "#636e72",
    marginTop: 3,
  },

  /* ── Decision ── */
  decisionCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dfe6e9",
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#636e72",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 14,
    color: "#2d3436",
    lineHeight: 20,
  },

  /* ── Competitors ── */
  competitorCard: {
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#dfe6e9",
    borderLeftWidth: 3,
    borderLeftColor: "#e17055",
  },
  competitorName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 4,
  },
  competitorContext: {
    fontSize: 13,
    lineHeight: 20,
    color: "#2d3436",
  },

  /* ── Risk ── */
  riskCard: {
    backgroundColor: "#fff5f5",
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#d63031",
  },
  riskText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#2d3436",
  },

  /* ── Pricing/Volume ── */
  pvCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dfe6e9",
  },
  pvRow: {
    marginBottom: 12,
  },
  pvLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#636e72",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  pvValue: {
    fontSize: 14,
    lineHeight: 20,
    color: "#2d3436",
  },

  /* ── Topics ── */
  topicWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  topicChip: {
    backgroundColor: "#1a1a2e10",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  topicText: {
    fontSize: 13,
    color: "#1a1a2e",
    fontWeight: "500",
  },

  /* ── Stage ── */
  stageCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dfe6e9",
  },
  stageFlow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    gap: 12,
  },
  stageBubble: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dfe6e9",
    alignItems: "center",
  },
  stageBubbleRecommended: {
    backgroundColor: "#00b89410",
    borderColor: "#00b894",
  },
  stageSmallLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#636e72",
    letterSpacing: 1,
    marginBottom: 4,
  },
  stageName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1a2e",
    textAlign: "center",
  },
  stageNameRecommended: {
    color: "#00b894",
  },
  stageArrow: {
    fontSize: 20,
    color: "#636e72",
    fontWeight: "700",
  },
  stageRationale: {
    fontSize: 13,
    color: "#636e72",
    lineHeight: 19,
    fontStyle: "italic",
    textAlign: "center",
  },

  /* ── Follow-Up ── */
  followUpBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f346010",
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    gap: 14,
  },
  followUpIcon: {
    fontSize: 28,
  },
  followUpLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#636e72",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  followUpDate: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f3460",
    marginTop: 2,
  },

  /* ── Footer ── */
  footer: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 8,
  },
  footerText: {
    fontSize: 11,
    color: "#b2bec3",
  },
});
