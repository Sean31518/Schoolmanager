export interface UserDto {
  id: string;
  email: string;
  displayName: string;
}

export interface SettingsDto {
  id: string;
  userId: string;
  currentGradeLevel: number;
  currentSchoolYearLabel: string | null;
  federalState: string;
  createdAt: string;
  updatedAt: string;
  iservHost: string | null;
  iservUsername: string | null;
  iservClass: string | null;
  iservLastSyncAt: string | null;
  iservLastSyncError: string | null;
  iservConfigured: boolean;
}
