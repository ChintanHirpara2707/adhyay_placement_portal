import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Theme } from '@/theme/theme';
import { timeAgo } from '@/lib/format';

interface ActivityFeedItemProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  message: string;
  timestamp: string;
  unread?: boolean;
  iconColor?: string;
}

export const ActivityFeedItem: React.FC<ActivityFeedItemProps> = ({
  icon,
  message,
  timestamp,
  unread = false,
  iconColor = Theme.colors.primaryAccent,
}) => {
  return (
    <View style={[styles.row, unread && styles.unreadRow]}>
      <View style={[styles.iconWrap, { backgroundColor: `${iconColor}12` }]}>
        <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.message, unread && styles.unreadMessage]}>{message}</Text>
        <Text style={styles.time}>{timeAgo(timestamp)}</Text>
      </View>
      {unread ? <View style={styles.dot} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.borderLight,
  },
  unreadRow: { backgroundColor: '#F8FAFC', borderRadius: 8, paddingHorizontal: 8 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  message: { fontSize: 13, color: Theme.colors.primaryText, lineHeight: 18 },
  unreadMessage: { fontWeight: '600' },
  time: { fontSize: 11, color: Theme.colors.secondaryText },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.primaryAccent,
    marginTop: 6,
  },
});
