import { Navigate, Route, Routes } from 'react-router-dom'
import { useAppliedLocale } from './i18n/useAppliedLocale'
import { DiagramsPage } from './pages/DiagramsPage'
import { EditorPage } from './pages/EditorPage'
import { useAppliedTheme } from './store/useTheme'

export default function App() {
  useAppliedTheme()
  useAppliedLocale()

  return (
    <Routes>
      <Route path="/" element={<DiagramsPage />} />
      <Route path="/d/:systemId" element={<EditorPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
