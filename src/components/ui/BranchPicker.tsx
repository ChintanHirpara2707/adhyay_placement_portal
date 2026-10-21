import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { C } from '@/theme/design';
import { Theme } from '@/theme/theme';
import { BRANCHES, BRANCH_GROUPS } from '@/constants/branches';

/**
 * Multi-select branch chips grouped by programme. Chips wrap onto new rows (never overflow or break
 * a label mid-word) and show a check when selected.
 */
export const BranchPicker: React.FC<{
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
}> = ({ value, onChange, error }) => {
  const toggle = (b: string) => onChange(value.includes(b) ? value.filter((x) => x !== b) : [...value, b]);
  const allSelected = value.length === BRANCHES.length;

  return (
    <View style={styles.wrap}>
      <View style={styles.toolbar}>
        <Text style={styles.count} accessibilityLiveRegion="polite">
          {value.length} selected
        </Text>
        <View style={styles.links}>
          <Pressable
            onPress={() => onChange([...BRANCHES])}
            disabled={allSelected}
            accessibilityRole="button"
            accessibilityLabel="Select all branches"
            style={styles.linkBtn}
          >
            <Text style={[styles.link, allSelected && styles.linkDisabled]}>Select all</Text>
          </Pressable>
          <Pressable
            onPress={() => onChange([])}
            disabled={value.length === 0}
            accessibilityRole="button"
            accessibilityLabel="Clear selected branches"
            style={styles.linkBtn}
          >
            <Text style={[styles.link, value.length === 0 && styles.linkDisabled]}>Clear</Text>
          </Pressable>
        </View>
      </View>

      {BRANCH_GROUPS.map((group) => (
        <View key={group.title} style={styles.group}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          <View style={styles.chips}>
            {group.items.map((b) => {
              const selected = value.includes(b);
              return (
                <Pressable
                  key={b}
                  onPress={() => toggle(b)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={b}
                  style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && { opacity: 0.85 }]}
                >
                  {selected ? <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" /> : null}
                  <Text numberOfLines={1} style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {b}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const gap = Theme.spacing.sm;

const styles = StyleSheet.create({
  wrap: { gap: Theme.spacing.md },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  count: { fontSize: 13, color: C.muted, fontWeight: '500' },
  links: { flexDirection: 'row', gap: Theme.spacing.sm },
  linkBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Theme.spacing.sm },
  link: { fontSize: 14, fontWeight: '600', color: C.accent },
  linkDisabled: { color: C.faint },
  group: { gap },
  groupTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: C.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    minHeight: 40,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card,
  },
  chipSelected: { backgroundColor: C.navy, borderColor: C.navy },
  chipText: { fontSize: 14, fontWeight: '500', color: C.inkSoft },
  chipTextSelected: { color: '#FFFFFF', fontWeight: '600' },
  error: { fontSize: 12, color: C.danger },
});
