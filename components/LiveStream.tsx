import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { colors, radii, spacing } from '@/constants/theme';

type LiveStreamProps = {
  title: string;
  embedUrl: string;
};

export function LiveStream({ title, embedUrl }: LiveStreamProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Live Stream</Text>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.frame}>
        <WebView
          source={{ uri: embedUrl }}
          style={styles.webview}
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.night,
    borderColor: 'rgba(217, 173, 67, .35)',
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  label: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ivory,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  frame: {
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
  },
});
