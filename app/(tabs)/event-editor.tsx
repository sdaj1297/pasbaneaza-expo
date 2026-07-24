import { useEffect, useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AdminEventDraft, AdminEventForm } from '@/components/AdminEventForm';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/Card';
import { colors, fonts, radii, spacing, typography } from '@/constants/theme';
import { CommunityEvent } from '@/data/mock';
import { fetchAdminEvent, updateAdminEvent } from '@/lib/api';
import { AuthUser, subscribeToAuthState } from '@/lib/auth';
import { audienceToEventType } from '@/lib/eventFormOptions';

export default function EventEditorScreen() {
  const params = useLocalSearchParams<{ eventId?: string | string[] }>();
  const requestedEventId = Array.isArray(params.eventId) ? params.eventId[0] : params.eventId;
  const [eventId, setEventId] = useState<string | undefined>();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [event, setEvent] = useState<CommunityEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => subscribeToAuthState((user) => {
    setAuthUser(user);
    setAuthReady(true);
  }), []);

  useEffect(() => {
    setEventId(requestedEventId);
  }, [requestedEventId]);

  useEffect(() => {
    let active = true;
    if (!authReady || !authUser?.isAdmin || !eventId) {
      if (authReady) setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    fetchAdminEvent(eventId).then((nextEvent) => {
      if (!active) return;
      setEvent(nextEvent);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [authReady, authUser?.isAdmin, eventId]);

  const saveEvent = async (draft: AdminEventDraft) => {
    if (!event) return;

    setSaving(true);
    setNotice('');
    try {
      const updatedEvent = await updateAdminEvent(event.id, event.date, {
        title: draft.title,
        contactName: draft.contactName,
        date: draft.date,
        time: draft.time,
        address: draft.address,
        locationName: draft.locationName,
        type: audienceToEventType(draft.audience),
        isAnjumanSchedule: draft.isAnjumanSchedule === 'yes',
        isPublished: draft.isPublished === 'yes',
        waitingApproval: draft.waitingApproval === 'yes',
        isPlaceholder: draft.isPlaceholder === 'yes',
      });
      setEvent(updatedEvent);
      setNotice('Event changes saved.');
    } catch {
      setNotice('Unable to save this event. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      title="Edit event"
      subtitle={event ? `${event.contactName || event.title} · ${event.date}` : 'Review one event before saving changes'}
    >
      <View style={styles.toolbar}>
        <Link href="/events" asChild>
          <Pressable style={styles.backLink}>
            <ArrowLeft color={colors.gold} size={18} strokeWidth={2} />
            <Text style={styles.backLinkText}>Back to schedule</Text>
          </Pressable>
        </Link>
        <Text style={styles.editorId}>{eventId ? `Event ${eventId}` : 'No event selected'}</Text>
      </View>

      {!authReady || loading ? (
        <Card>
          <Text style={styles.title}>Loading event</Text>
          <Text style={styles.meta}>Checking your admin session and retrieving the selected event.</Text>
        </Card>
      ) : null}

      {authReady && !authUser?.isAdmin ? (
        <Card>
          <Text style={styles.title}>Admin login required</Text>
          <Text style={styles.meta}>Only Pasban administrators can edit event records.</Text>
          <Link href="/login" asChild>
            <Pressable style={styles.loginButton}>
              <Text style={styles.loginButtonText}>Login</Text>
            </Pressable>
          </Link>
        </Card>
      ) : null}

      {authReady && authUser?.isAdmin && !loading && !event ? (
        <Card>
          <Text style={styles.title}>Event not found</Text>
          <Text style={styles.meta}>Return to the schedule and choose another event.</Text>
        </Card>
      ) : null}

      {notice ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}

      {authUser?.isAdmin && event ? (
        <AdminEventForm disabled={saving} event={event} onSave={saveEvent} />
      ) : null}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
    paddingBottom: spacing.lg,
    paddingTop: spacing.lg,
  },
  backLink: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 40,
  },
  backLinkText: {
    color: colors.ink,
    fontFamily: fonts.bodyBold,
    fontSize: typography.small,
  },
  editorId: {
    color: colors.textSubtle,
    fontFamily: fonts.bodyMedium,
    fontSize: typography.overline,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ink,
    fontFamily: fonts.displayMedium,
    fontSize: 28,
    lineHeight: 32,
  },
  meta: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: typography.small,
    lineHeight: 21,
    marginTop: spacing.xs,
  },
  loginButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.ivory,
    borderRadius: radii.sm,
    justifyContent: 'center',
    marginTop: spacing.md,
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  loginButtonText: {
    color: colors.onIvory,
    fontFamily: fonts.bodyBold,
    fontSize: typography.small,
  },
  notice: {
    borderBottomColor: colors.gold,
    borderBottomWidth: 1,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
  },
  noticeText: {
    color: colors.gold,
    fontFamily: fonts.bodySemibold,
    fontSize: typography.small,
  },
});
