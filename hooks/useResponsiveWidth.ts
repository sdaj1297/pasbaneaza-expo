import { useSyncExternalStore } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

type BrowserGlobal = typeof globalThis & {
  innerWidth?: number;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

function getBrowserGlobal() {
  return globalThis as BrowserGlobal;
}

function subscribeToBrowserWidth(onStoreChange: () => void) {
  const browserGlobal = getBrowserGlobal();
  if (!browserGlobal.addEventListener || !browserGlobal.removeEventListener) return () => {};
  browserGlobal.addEventListener('resize', onStoreChange);
  return () => browserGlobal.removeEventListener?.('resize', onStoreChange);
}

function getBrowserWidth() {
  return getBrowserGlobal().innerWidth || 0;
}

function getServerWidth() {
  return 0;
}

export function useResponsiveWidth() {
  const { width: nativeWidth } = useWindowDimensions();
  const webWidth = useSyncExternalStore(
    subscribeToBrowserWidth,
    getBrowserWidth,
    getServerWidth,
  );

  return Platform.OS === 'web' ? webWidth : nativeWidth;
}
