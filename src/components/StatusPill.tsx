import React from 'react';
import { StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MotiView } from 'moti';
import { Theme } from '@/theme/theme';

interface StatusPillProps {
  status: 'applied' | 'shortlisted' | 'interview_scheduled' | 'selected' | 'rejected' | string;
}

export default function StatusPill({ status }: StatusPillProps) {
  let backgroundColor = Theme.colors.status.applied.bg;
  let textColor = Theme.colors.status.applied.text;
  let label = status;

  switch (status) {
    case 'applied':
      backgroundColor = Theme.colors.status.applied.bg;
      textColor = Theme.colors.status.applied.text;
      label = 'Applied';
      break;
    case 'shortlisted':
      backgroundColor = Theme.colors.status.shortlisted.bg;
      textColor = Theme.colors.status.shortlisted.text;
      label = 'Shortlisted';
      break;
    case 'interview_scheduled':
      backgroundColor = Theme.colors.status.interview_scheduled.bg;
      textColor = Theme.colors.status.interview_scheduled.text;
      label = 'Interview Scheduled';
      break;
    case 'round_cleared':
      backgroundColor = '#CCFBF1';
      textColor = '#0F766E';
      label = 'Round Cleared';
      break;
    case 'selected':
      backgroundColor = Theme.colors.status.selected.bg;
      textColor = Theme.colors.status.selected.text;
      label = 'Selected';
      break;
    case 'rejected':
      backgroundColor = Theme.colors.status.rejected.bg;
      textColor = Theme.colors.status.rejected.text;
      label = 'Rejected';
      break;
    default:
      label = status.replace('_', ' ');
      break;
  }

  return (
    <MotiView
      animate={{
        scale: 1,
        opacity: 1,
      }}
      from={{
        scale: 0.9,
        opacity: 0.8,
      }}
      transition={{
        type: 'timing',
        duration: 250,
      }}
      style={[styles.pill, { backgroundColor }]}
    >
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.pill,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
