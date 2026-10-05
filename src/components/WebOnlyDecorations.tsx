import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';

export const WebOnlyDecorations: React.FC = () => {
  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.webContainer}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            radial-gradient(circle at 15% 15%, rgba(30, 58, 138, 0.035) 0%, transparent 40%),
            radial-gradient(circle at 85% 85%, rgba(16, 185, 129, 0.03) 0%, transparent 40%),
            linear-gradient(to right, rgba(229, 231, 235, 0.35) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(229, 231, 235, 0.35) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 100% 100%, 36px 36px, 36px 36px',
          pointerEvents: 'none',
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  webContainer: {
    ...StyleSheet.absoluteFill,
    zIndex: -1,
  },
});
