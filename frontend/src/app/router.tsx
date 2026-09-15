import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import { LoginPage } from '../features/auth/LoginPage'
import { RegisterPage } from '../features/auth/RegisterPage'
import { CalendarPage } from '../features/calendar/CalendarPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { ExamPrepPage } from '../features/examPrep/ExamPrepPage'
import { ExamsListPage } from '../features/examPrep/ExamsListPage'
import { ExamStudyPage } from '../features/examPrep/ExamStudyPage'
import { NoteEditorPage } from '../features/notes/NoteEditorPage'
import { SectionTypeOverviewPage } from '../features/notes/SectionTypeOverviewPage'
import { TopicDetailPage } from '../features/notes/TopicDetailPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { SubjectDetailPage } from '../features/subjects/SubjectDetailPage'
import { SubjectsPage } from '../features/subjects/SubjectsPage'
import { TimetablePage } from '../features/timetable/TimetablePage'
import { Layout } from './Layout'

function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-500">
        Lädt...
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/timetable" element={<TimetablePage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/exams" element={<ExamsListPage />} />
        <Route path="/exams/:eventId" element={<ExamPrepPage />} />
        <Route path="/exams/:eventId/study" element={<ExamStudyPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/subjects" element={<SubjectsPage />} />
        <Route path="/subjects/:subjectId" element={<SubjectDetailPage />} />
        <Route
          path="/subjects/:subjectId/sections/:sectionTypeId"
          element={<SectionTypeOverviewPage />}
        />
        <Route
          path="/subjects/:subjectId/sections/:sectionTypeId/topics/:topicId"
          element={<TopicDetailPage />}
        />
        <Route
          path="/subjects/:subjectId/sections/:sectionTypeId/topics/:topicId/notes/:noteId"
          element={<NoteEditorPage />}
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
