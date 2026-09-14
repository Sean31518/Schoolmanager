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
}
