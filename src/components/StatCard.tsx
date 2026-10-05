import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { MotiView } from 'moti';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Theme } from '@/theme/theme';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  accent?: string;
  sub?: string;
  onPress?: () => void;
  delay?: number;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  accent = Theme.colors.primaryAccent,
  sub,
  onPress,
  delay = 0,
}) => {
  const inner = (
    <Card style={styles.card} elevation={1}>
      <Card.Content style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: `${accent}14` }]}>
          <MaterialCommunityIcons name={icon} size={20} color={accent} />
        </View>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </Card.Content>
    </Card>
  );

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 280, delay }}
      style={styles.wrapper}
    >
      {onPress ? (
        <View onTouchEnd={onPress} style={styles.touch}>
          {inner}
        </View>
      ) : (
        inner
      )}
    </MotiView>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, minWidth: 100 },
  touch: { flex: 1 },
  card: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    flex: 1,
  },
  content: { alignItems: 'center', paddingVertical: Theme.spacing.md, gap: 4 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  value: { fontSize: 20, fontWeight: '700', color: Theme.colors.primaryText },
  label: { fontSize: 12, color: Theme.colors.secondaryText, textAlign: 'center' },
  sub: { fontSize: 11, color: Theme.colors.secondaryText, textAlign: 'center' },
});
