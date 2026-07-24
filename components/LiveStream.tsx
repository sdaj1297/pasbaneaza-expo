import { createElement } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { colors, fonts, radii, spacing, typography } from '@/constants/theme';

type LiveStreamProps = {
  title: string;
  embedUrl: string;
};

export function LiveStream({ title, embedUrl }: LiveStreamProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <View style={styles.liveDot} />
        <Text style={styles.label}>Live stream</Text>
        <Text numberOfLines={1} style={styles.title}>{title}</Text>
      </View>
      <View style={styles.frame}>
        {Platform.OS === 'web'
          ? createElement('iframe', {
              allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
              allowFullScreen: true,
              frameBorder: '0',
              src: embedUrl,
              style: {
                border: 0,
                height: '100%',
                width: '100%',
              },
              title,
            })
          : (
            <WebView
              source={{ uri: embedUrl }}
              style={styles.webview}
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
            />
          )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 54,
    paddingHorizontal: spacing.md,
  },
  liveDot: {
    backgroundColor: colors.red,
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  label: {
    color: colors.red,
    fontFamily: fonts.bodyBold,
    fontSize: typography.overline,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.muted,
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: typography.small,
  },
  frame: {
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
  },
});
