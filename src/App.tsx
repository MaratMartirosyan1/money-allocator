import { Navigate, Route, Routes } from 'react-router-dom'
import { DiagramsPage } from './pages/DiagramsPage'
import { EditorPage } from './pages/EditorPage'
import { useAppliedTheme } from './store/useTheme'

export default function App() {
  useAppliedTheme()

  return (
    <Routes>
      <Route path="/" element={<DiagramsPage />} />
      <Route path="/d/:systemId" element={<EditorPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
