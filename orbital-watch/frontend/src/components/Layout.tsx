import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import StatusBar from './StatusBar'

export default function Layout() {
  return (
    <div className="flex flex-col h-screen bg-[#060813] text-slate-100 overflow-hidden font-sans select-none">
      {/* Top Header Bar spanning full width */}
      <StatusBar />
      
      {/* Body: Sidebar + Main Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 lg:p-4 bg-[#050711]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
