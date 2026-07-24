import { CommunityEvent } from '@/data/mock';

export type EventTone = 'committed' | 'sisters' | 'community';

export function getEventTone(event: CommunityEvent): EventTone {
  if (event.type === 'W') return 'sisters';
  if (event.isAnjumanSchedule) return 'committed';
  return 'community';
}

export function getEventToneLabel(event: CommunityEvent) {
  const tone = getEventTone(event);
  if (tone === 'sisters') return 'Sisters only';
  if (tone === 'committed') return 'Anjuman committed';
  return 'Community listing';
}

export function getEventAudienceLabel(event: CommunityEvent) {
  if (event.type === 'W') return 'Sisters';
  if (event.type === 'M') return 'Brothers';
  if (event.type === 'F' || event.type === 'A') return 'Family';
  return 'Program';
}
