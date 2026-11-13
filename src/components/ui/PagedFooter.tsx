import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Button } from '@/components/ui/AppButton';
import { C } from '@/theme/design';

interface Props {
  loadingMore: boolean;
  moreError: boolean;
  hasMore: boolean;
  onRetry: () => void;
  /** Rows loaded so far and the exact total (when known), for the "Showing x of y" line. */
  shown?: number;
  total?: number | null;
  /** Adds a "Load more" button (for ScrollView lists where scrolling alone may not reach the end). */
  onLoadMore?: () => void;
}

/** Footer for infinite lists: spinner while loading, retry after a failure, "Load more" fallback, end-of-list line. */
export function PagedFooter({ loadingMore, moreError, hasMore, onRetry, shown, total, onLoadMore }: Props) {
  if (loadingMore) {
    return (
      <View style={styles.wrap}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }
  if (moreError) {
    return (
      <View style={styles.wrap}>
        <Button mode="outlined" icon="refresh" onPress={onRetry} textColor={C.accent} style={styles.btn}>
          Could not load more — retry
        </Button>
      </View>
    );
  }
  if (hasMore && onLoadMore) {
    return (
      <View style={styles.wrap}>
        <Button mode="outlined" onPress={onLoadMore} textColor={C.accent} style={styles.btn}>
          Load more
        </Button>
      </View>
    );
  }
  if (!hasMore && shown && shown > 0) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.end}>{total != null ? `Showing all ${total}` : `Showing all ${shown}`}</Text>
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 16, alignItems: 'center' },
  btn: { borderRadius: 10, borderColor: C.line },
  end: { fontSize: 12, color: C.muted },
});
