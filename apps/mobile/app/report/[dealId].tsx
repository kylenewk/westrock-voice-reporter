import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { COLORS } from "../../constants/config";
import { ReportView } from "../../components/ReportView";
import { useInterview } from "../../hooks/useInterview";
import * as api from "../../services/api";
import type { StructuredReport, UploadResult } from "../../types";

export default function ReportScreen() {
  const { dealId } = useLocalSearchParams<{ dealId: string }>();
  const router = useRouter();
  const { report: interviewReport, sessionId } = useInterview();

  const [report, setReport] = useState<StructuredReport | null>(
    interviewReport
  );
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // If we don't have a report from interview context, try generating one
  useEffect(() => {
    if (!report && sessionId) {
      api
        .generateReport(sessionId)
        .then((r) => setReport(r.report))
        .catch((err) => setError(err.message));
    }
  }, [report, sessionId]);

  const handleUpload = async () => {
    if (!report || !dealId) return;

    Alert.alert(
      "Upload to HubSpot",
      "This will create a note and log a call on this deal in HubSpot. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Upload",
          onPress: async () => {
            setUploading(true);
            setError(null);
            try {
              const result = await api.uploadReport(dealId, report, {
                createNote: true,
                logCall: true,
                updateDeal: true,
              });
              setUploadResult(result);
            } catch (err: any) {
              setError(err.message || "Upload failed");
            } finally {
              setUploading(false);
            }
          },
        },
      ]
    );
  };

  // Loading state
  if (!report) {
    return (
      <View style={styles.centered}>
        {error ? (
          <>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => router.back()}
            >
              <Text style={styles.retryButtonText}>Go Back</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loadingText}>Generating report...</Text>
          </>
        )}
      </View>
    );
  }

  // Upload success state
  if (uploadResult) {
    return (
      <View style={styles.centered}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.successTitle}>Report Uploaded</Text>
        <Text style={styles.successSubtitle}>
          Your call report has been uploaded to HubSpot.
        </Text>
        <View style={styles.uploadDetails}>
          {uploadResult.noteId && (
            <Text style={styles.uploadDetail}>Note created</Text>
          )}
          {uploadResult.callId && (
            <Text style={styles.uploadDetail}>Call logged</Text>
          )}
          {uploadResult.dealUpdated && (
            <Text style={styles.uploadDetail}>Deal updated</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => router.replace("/")}
          activeOpacity={0.8}
        >
          <Text style={styles.doneButtonText}>Back to Deals</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ReportView report={report} />

      {/* Error */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.discardButton}
          onPress={() => {
            Alert.alert(
              "Discard Report",
              "Are you sure? This report will be lost.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Discard",
                  style: "destructive",
                  onPress: () => router.replace("/"),
                },
              ]
            );
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.discardButtonText}>Discard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
          onPress={handleUpload}
          disabled={uploading}
          activeOpacity={0.8}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.uploadButtonText}>Upload to HubSpot</Text>
          )}
        </TouchableOpacity>
      </View>
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
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  successIcon: {
    fontSize: 64,
    color: COLORS.success,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 20,
  },
  uploadDetails: {
    marginBottom: 30,
  },
  uploadDetail: {
    fontSize: 14,
    color: COLORS.success,
    marginBottom: 4,
    textAlign: "center",
  },
  doneButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  doneButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  errorBanner: {
    marginHorizontal: 16,
    padding: 12,
    backgroundColor: "#ffeaea",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  errorBannerText: {
    color: COLORS.error,
    fontSize: 14,
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    paddingBottom: 32,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  discardButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  discardButtonText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  uploadButton: {
    flex: 2,
    backgroundColor: COLORS.success,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  uploadButtonDisabled: {
    opacity: 0.7,
  },
  uploadButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});
