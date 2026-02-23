import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { COLORS } from "../constants/config";
import { useDeals } from "../hooks/useDeals";

export default function HomeScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { deals, loading, error, search, loadMore, hasMore } = useDeals();

  const handleSearch = () => {
    if (query.trim()) {
      search(query.trim());
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search deals by name..."
          placeholderTextColor={COLORS.textLight}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Empty State */}
      {!loading && deals.length === 0 && !error && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>Search for a Deal</Text>
          <Text style={styles.emptySubtitle}>
            Enter a deal or customer name to start a call report
          </Text>
        </View>
      )}

      {/* Results */}
      <FlatList
        data={deals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.dealCard}
            onPress={() => router.push(`/deal/${item.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.dealHeader}>
              <Text style={styles.dealName} numberOfLines={1}>
                {item.dealname}
              </Text>
              {item.amount && (
                <Text style={styles.dealAmount}>
                  ${Number(item.amount).toLocaleString()}
                </Text>
              )}
            </View>
            {item.customer_name && (
              <Text style={styles.dealCustomer}>{item.customer_name}</Text>
            )}
            <View style={styles.dealMeta}>
              {item.pipeline && (
                <Text style={styles.dealPipeline}>{item.pipeline}</Text>
              )}
              {item.dealstage && (
                <Text style={styles.dealStage}>{item.dealstage}</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        onEndReached={() => {
          if (hasMore && !loading) loadMore();
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loading ? (
            <ActivityIndicator
              style={styles.loader}
              size="small"
              color={COLORS.accent}
            />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: "center",
  },
  searchButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 15,
  },
  errorBanner: {
    marginHorizontal: 16,
    padding: 12,
    backgroundColor: "#ffeaea",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  dealCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  dealName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
    marginRight: 8,
  },
  dealAmount: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.success,
  },
  dealCustomer: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 8,
  },
  dealMeta: {
    flexDirection: "row",
    gap: 8,
  },
  dealPipeline: {
    fontSize: 12,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: "hidden",
  },
  dealStage: {
    fontSize: 12,
    color: COLORS.accent,
    backgroundColor: "#e8f0fe",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: "hidden",
  },
  loader: {
    marginVertical: 20,
  },
});
