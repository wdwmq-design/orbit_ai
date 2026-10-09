import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ImageAnalysisPage from './pages/ImageAnalysis'
import TrackExplorerPage from './pages/TrackExplorer'
import TrajectoryPage from './pages/Trajectory'
import SimulationPage from './pages/Simulation'
import PerformancePage from './pages/Performance'
import ReportsPage from './pages/Reports'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/image-analysis" replace />} />
        <Route path="image-analysis" element={<ImageAnalysisPage />} />
        <Route path="tracks" element={<TrackExplorerPage />} />
        <Route path="trajectory" element={<TrajectoryPage />} />
        <Route path="simulation" element={<SimulationPage />} />
        <Route path="performance" element={<PerformancePage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="*" element={<Navigate to="/image-analysis" replace />} />
      </Route>
    </Routes>
  )
}
