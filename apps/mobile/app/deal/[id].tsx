import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { COLORS } from "../../constants/config";
import { useDealDetail } from "../../hooks/useDeals";

export default function DealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { deal, loading, error } = useDealDetail(id);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Loading deal...</Text>
      </View>
    );
  }

  if (error || !deal) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || "Deal not found"}</Text>
      </View>
    );
  }

  const props = deal.deal.properties;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Deal Header */}
        <View style={styles.header}>
          <Text style={styles.dealName}>{props.dealname || "Unnamed Deal"}</Text>
          {props.customer_name && (
            <Text style={styles.customerName}>{props.customer_name}</Text>
          )}
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsRow}>
          <MetricCard
            label="Amount"
            value={
              props.amount
                ? `$${Number(props.amount).toLocaleString()}`
                : "—"
            }
          />
          <MetricCard label="Close Date" value={props.closedate || "—"} />
          <MetricCard
            label="Probability"
            value={
              props.probability_of_closing
                ? `${props.probability_of_closing}%`
                : "—"
            }
          />
        </View>

        {/* Deal Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deal Information</Text>
          <InfoRow label="Pipeline" value={props.pipeline} />
          <InfoRow label="Stage" value={props.dealstage} />
          <InfoRow label="Channel" value={props.channel} />
          <InfoRow label="Segment" value={props.segment_type} />
          <InfoRow label="Incumbent Supplier" value={props.incumbent_supplier} />
          <InfoRow label="Next Step" value={props.next_step} />
        </View>

        {/* Company */}
        {deal.company && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Company</Text>
            <InfoRow label="Name" value={deal.company.name} />
            <InfoRow label="Domain" value={deal.company.domain} />
            <InfoRow label="Industry" value={deal.company.industry} />
          </View>
        )}

        {/* Contacts */}
        {deal.contacts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Contacts ({deal.contacts.length})
            </Text>
            {deal.contacts.map((contact) => (
              <View key={contact.id} style={styles.contactCard}>
                <Text style={styles.contactName}>
                  {[contact.firstname, contact.lastname]
                    .filter(Boolean)
                    .join(" ") || "Unknown"}
                </Text>
                {contact.jobtitle && (
                  <Text style={styles.contactDetail}>{contact.jobtitle}</Text>
                )}
                {contact.email && (
                  <Text style={styles.contactDetail}>{contact.email}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Start Report Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => router.push(`/interview/${id}`)}
          activeOpacity={0.8}
        >
          <Text style={styles.startButtonText}>Start Call Report</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: "center",
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 16,
  },
  dealName: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.primary,
  },
  customerName: {
    fontSize: 16,
    color: COLORS.text,
    marginTop: 4,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textTransform: "uppercase",
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    width: 130,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  contactCard: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  contactName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  contactDetail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  startButton: {
    backgroundColor: COLORS.highlight,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  startButtonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
  },
});
