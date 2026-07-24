export type EventType = 'M' | 'W' | 'F' | 'A' | string;
export type MajlisStatus = 'Pending' | 'En Route' | 'Started' | 'Completed' | 'Delayed' | 'Skipped';

export type CommunityEvent = {
  id: string;
  title: string;
  contactName: string;
  date: string;
  time: string;
  islamicDate: string;
  type: EventType;
  locationName: string;
  address: string;
  flyer?: string;
  socialUrl?: string;
  isAnjumanSchedule: boolean;
  isPublished: boolean;
  waitingApproval: boolean;
};

export type PrayerTime = {
  label: string;
  time: string;
};

export type StatusItem = CommunityEvent & {
  status: MajlisStatus;
  stage?: string;
};

export type SpecialEvent = {
  id: string;
  title: string;
  eyebrow: string;
  dateLabel: string;
  description: string;
  flyerUrl?: string;
  liveStreamUrl?: string;
  isActive: boolean;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  html?: string;
  imageUrl?: string;
  fullPage?: boolean;
};

export type IslamicMonthLength = {
  index: number;
  key: string;
  name: string;
  length: number;
};

export type IslamicCalendarYear = {
  id: string;
  year: number;
  firstDate: string;
  months: IslamicMonthLength[];
};

export type IslamicCalendarEvent = {
  id: string;
  month: number;
  day: number;
  title: string;
  description: string;
  color: string;
};

export const todayLabel = 'June 28, 2026';
export const islamicTodayLabel = '13 Muharram, 1448';

export const announcements = [
  'Muharram programs are being updated daily. Please verify location and time before traveling.',
  'Community members can submit new events for review through the events form.',
];

export const specialEvent: SpecialEvent = {
  id: 'markazi-ashura-2026',
  eyebrow: 'Featured Event',
  title: 'Markazi Ashura Juloos',
  dateLabel: 'Muharram 10 / Downtown Houston',
  description:
    'When a major Pasban program is active, the home screen can shift into a featured event mode with flyer, livestream, route, and announcement placement.',
  liveStreamUrl: 'https://www.youtube.com/embed/live_stream?channel=UC_PLACEHOLDER',
  isActive: true,
};

export const socialLinks = [
  { label: 'Instagram', url: 'https://www.instagram.com/pasbaneaza' },
  { label: 'YouTube', url: 'https://www.youtube.com/@pasbaneaza' },
  { label: 'Website', url: 'https://pasbaneaza.org' },
];

export const events: CommunityEvent[] = [
  {
    id: '1001',
    title: 'Salana Majalis',
    contactName: 'Zafar Syed',
    date: '2026-06-28',
    time: '1:30 PM',
    islamicDate: '13 Muharram',
    type: 'M',
    locationName: 'Residence',
    address: '14903 Lake Woodbridge Court, Sugar Land, TX 77498',
    isAnjumanSchedule: true,
    isPublished: true,
    waitingApproval: false,
  },
  {
    id: '1002',
    title: 'Majlis e Aza @ The Residence of Irfan Bhai',
    contactName: 'Irfan A Sabir',
    date: '2026-06-28',
    time: '4:30 PM',
    islamicDate: '13 Muharram',
    type: 'F',
    locationName: 'Residence',
    address: '6215 Apple Bluff Ct, Sugar Land, TX 77479',
    isAnjumanSchedule: true,
    isPublished: true,
    waitingApproval: false,
  },
  {
    id: '1003',
    title: 'Majlis E Aza',
    contactName: 'Kayam Ali / Mohamed Fazl',
    date: '2026-06-28',
    time: '6:30 PM',
    islamicDate: '13 Muharram',
    type: 'M',
    locationName: 'Residence',
    address: '11535 Taagan Lane, Richmond, TX 77407',
    isAnjumanSchedule: true,
    isPublished: true,
    waitingApproval: false,
  },
  {
    id: '1004',
    title: 'Ladies Majlis',
    contactName: 'Reema Momin',
    date: '2026-06-30',
    time: '5:30 PM',
    islamicDate: '15 Muharram',
    type: 'W',
    locationName: 'Residence',
    address: 'Houston, TX',
    isAnjumanSchedule: false,
    isPublished: true,
    waitingApproval: false,
  },
];

export const islamicCalendarYears: IslamicCalendarYear[] = [
  {
    id: '68',
    year: 1448,
    firstDate: '2026-06-16',
    months: [
      { index: 1, key: 'MUHARRAM', name: 'Muharram', length: 30 },
      { index: 2, key: 'SAFAR', name: 'Safar', length: 29 },
      { index: 3, key: 'RABIA_AWAL', name: 'Rabi al-Awwal', length: 30 },
      { index: 4, key: 'RABIA_THANI', name: 'Rabi al-Thani', length: 29 },
      { index: 5, key: 'JAMADIAL_AWAL', name: 'Jumada al-Awwal', length: 30 },
      { index: 6, key: 'JAMADIAL_THANI', name: 'Jumada al-Thani', length: 29 },
      { index: 7, key: 'RAJAB', name: 'Rajab', length: 30 },
      { index: 8, key: 'SHABAN', name: 'Shaban', length: 29 },
      { index: 9, key: 'RAMAZAN', name: 'Ramadan', length: 30 },
      { index: 10, key: 'SHAWWAL', name: 'Shawwal', length: 30 },
      { index: 11, key: 'ZILQADAH', name: 'Dhu al-Qadah', length: 29 },
      { index: 12, key: 'ZILHAJ', name: 'Dhu al-Hijjah', length: 29 },
    ],
  },
];

export const islamicEvents: IslamicCalendarEvent[] = [
  { id: 'muharram-1', month: 1, day: 1, title: 'Muharram begins', description: '', color: 'R' },
  { id: 'ashura', month: 1, day: 10, title: 'Ashura', description: '', color: 'R' },
  { id: 'arbaeen', month: 2, day: 20, title: 'Arbaeen', description: '', color: 'R' },
  { id: 'eid-ghadeer', month: 12, day: 18, title: 'Eid-e-Ghadeer', description: '', color: 'G' },
];

export const prayerTimes: PrayerTime[] = [
  { label: 'Fajr', time: '5:00 AM' },
  { label: 'Sunrise', time: '6:24 AM' },
  { label: 'Zohr', time: '1:25 PM' },
  { label: 'Sunset', time: '8:26 PM' },
  { label: 'Magrib', time: '8:43 PM' },
];

export const statusItems: StatusItem[] = events
  .filter((event) => event.date === '2026-06-28' && event.isAnjumanSchedule)
  .map((event, index) => ({
    ...event,
    status: index === 0 ? 'Started' : 'Pending',
    stage: index === 0 ? 'Hadis e Kisa' : undefined,
  }));
