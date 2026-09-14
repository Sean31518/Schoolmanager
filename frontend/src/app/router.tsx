import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import { LoginPage } from '../features/auth/LoginPage'
import { RegisterPage } from '../features/auth/RegisterPage'
import { CalendarPage } from '../features/calendar/CalendarPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { NoteEditorPage } from '../features/notes/NoteEditorPage'
import { SectionTypeOverviewPage } from '../features/notes/SectionTypeOverviewPage'
import { SubjectDetailPage } from '../features/subjects/SubjectDetailPage'
import { SubjectsPage } from '../features/subjects/SubjectsPage'
import { TimetablePage } from '../features/timetable/TimetablePage'
import { Layout } from './Layout'

function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
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
        <Route path="/subjects" element={<SubjectsPage />} />
        <Route path="/subjects/:subjectId" element={<SubjectDetailPage />} />
        <Route
          path="/subjects/:subjectId/sections/:sectionTypeId"
          element={<SectionTypeOverviewPage />}
        />
        <Route
          path="/subjects/:subjectId/sections/:sectionTypeId/:gradeLevel"
          element={<NoteEditorPage />}
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
