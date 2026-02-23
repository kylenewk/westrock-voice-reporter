import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { COLORS } from "../constants/config";
import type { StructuredReport } from "../types";

interface ReportViewProps {
  report: StructuredReport;
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

const sentimentColors: Record<string, string> = {
  positive: COLORS.success,
  neutral: COLORS.listening,
  negative: COLORS.error,
  mixed: COLORS.warning,
};

export function ReportView({ report }: ReportViewProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Call Report</Text>
        <View style={styles.headerMeta}>
          <Badge text={report.callType} color={COLORS.accent} />
          <Badge
            text={report.customerSentiment}
            color={sentimentColors[report.customerSentiment] ?? COLORS.textSecondary}
          />
          {report.callDate ? (
            <Text style={styles.date}>{report.callDate}</Text>
          ) : null}
        </View>
      </View>

      {/* Summary */}
      <View style={styles.section}>
        <SectionHeader title="Summary" />
        <Text style={styles.bodyText}>{report.summary}</Text>
      </View>

      {/* Attendees */}
      {report.attendees.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Attendees" />
          {report.attendees.map((a, i) => (
            <View key={i} style={styles.listItem}>
              <Text style={styles.listItemTitle}>{a.name}</Text>
              <Text style={styles.listItemSub}>
                {a.title}
                {a.company ? ` - ${a.company}` : ""}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Topics Discussed */}
      {report.topicsDiscussed.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Topics Discussed" />
          {report.topicsDiscussed.map((t, i) => (
            <View key={i} style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>{t}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Key Insights */}
      {report.keyInsights.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Key Insights" />
          {report.keyInsights.map((ins, i) => (
            <View key={i} style={styles.insightCard}>
              <Text style={styles.insightText}>{ins}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Action Items */}
      {report.actionItems.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Action Items" />
          {report.actionItems.map((ai, i) => (
            <View key={i} style={styles.actionItem}>
              <View style={styles.actionCheck}>
                <Text style={styles.checkIcon}>☐</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionText}>{ai.action}</Text>
                <Text style={styles.actionMeta}>
                  Owner: {ai.owner}
                  {ai.dueDate ? ` | Due: ${ai.dueDate}` : ""}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Next Steps */}
      {report.nextSteps.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Next Steps" />
          {report.nextSteps.map((ns, i) => (
            <View key={i} style={styles.listItem}>
              <Text style={styles.listItemTitle}>{ns.step}</Text>
              <Text style={styles.listItemSub}>{ns.timeline}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Competitor Mentions */}
      {report.competitorMentions.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Competitor Mentions" />
          {report.competitorMentions.map((cm, i) => (
            <View key={i} style={styles.listItem}>
              <Text style={styles.listItemTitle}>{cm.competitor}</Text>
              <Text style={styles.listItemSub}>{cm.context}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Deal Stage Recommendation */}
      {report.dealStageRecommendation && (
        <View style={styles.section}>
          <SectionHeader title="Deal Stage Recommendation" />
          <View style={styles.stageCard}>
            <View style={styles.stageRow}>
              <Text style={styles.stageLabel}>Current:</Text>
              <Text style={styles.stageValue}>
                {report.dealStageRecommendation.currentStage}
              </Text>
            </View>
            <View style={styles.stageRow}>
              <Text style={styles.stageLabel}>Recommended:</Text>
              <Text style={[styles.stageValue, styles.stageRecommended]}>
                {report.dealStageRecommendation.recommendedStage}
              </Text>
            </View>
            <Text style={styles.stageRationale}>
              {report.dealStageRecommendation.rationale}
            </Text>
          </View>
        </View>
      )}

      {/* Pricing & Volume Notes */}
      {(report.pricingNotes || report.volumeNotes) && (
        <View style={styles.section}>
          <SectionHeader title="Pricing & Volume" />
          {report.pricingNotes && (
            <Text style={styles.bodyText}>{report.pricingNotes}</Text>
          )}
          {report.volumeNotes && (
            <Text style={[styles.bodyText, { marginTop: 8 }]}>
              {report.volumeNotes}
            </Text>
          )}
        </View>
      )}

      {/* Follow-up Date */}
      {report.followUpDate && (
        <View style={styles.section}>
          <SectionHeader title="Follow-Up" />
          <Text style={styles.bodyText}>{report.followUpDate}</Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 8,
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  date: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 6,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.text,
  },
  listItem: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  listItemSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  bulletItem: {
    flexDirection: "row",
    paddingVertical: 4,
  },
  bullet: {
    fontSize: 15,
    color: COLORS.accent,
    marginRight: 8,
    marginTop: 1,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.text,
  },
  insightCard: {
    backgroundColor: "#f0f4ff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  insightText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text,
  },
  actionItem: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  actionCheck: {
    marginRight: 10,
    marginTop: 2,
  },
  checkIcon: {
    fontSize: 16,
    color: COLORS.accent,
  },
  actionContent: {
    flex: 1,
  },
  actionText: {
    fontSize: 15,
    color: COLORS.text,
  },
  actionMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  stageCard: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stageRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  stageLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    width: 100,
  },
  stageValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  stageRecommended: {
    color: COLORS.success,
  },
  stageRationale: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 8,
    fontStyle: "italic",
  },
});
