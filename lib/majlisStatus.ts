import { MajlisStatus } from '@/data/mock';

export const majlisStatuses: MajlisStatus[] = [
  'Pending',
  'En Route',
  'Started',
  'Completed',
  'Delayed',
  'Skipped',
];

export const majlisStages = [
  'Hadis e Kisa',
  'Salaam',
  'Marsiya',
  'Speech',
  'Maatam',
] as const;

export function stageForStatus(status: MajlisStatus, currentStage?: string) {
  return status === 'Started' ? currentStage || majlisStages[0] : undefined;
}
