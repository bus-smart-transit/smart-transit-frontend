import { useState } from 'react'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import DashboardHeader from './components/Dashboard/Dashboard'
import FleetsPanel from './components/Fleets/Fleets'
import RoutesPanel from './components/Routes/Routes'
import SchedulePanel from './components/Schedule/Schedule'
import ReportsPanel from './components/Reports/Reports'
import StaffPanel from './components/Staff/Staff'
import {
  stats,
  trips,
  fleetTrips,
  routeStats,
  routeAdherenceRows,
  peakDemandHours,
  scheduleStats,
  scheduleTrips,
  financialStats,
  financialRows,
  staffMembers,
} from './data/mockData'

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')

  if (!isLoggedIn) {
    return <Login onSignIn={() => setIsLoggedIn(true)} />
  }

  return (
    <div className="flex min-h-screen bg-[#f4f4f4]">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          {activeTab === 'dashboard' ? (
            <DashboardHeader
              title="Dashboard"
              stats={stats}
              trips={trips}
              isDashboardView
            />
          ) : null}

          {activeTab === 'fleets' ? (
            <>
              <DashboardHeader title="Active Monitoring" />
              <FleetsPanel fleetTrips={fleetTrips} />
            </>
          ) : null}

          {activeTab === 'routes' ? (
            <RoutesPanel
              routeStats={routeStats}
              routeAdherenceRows={routeAdherenceRows}
              peakDemandHours={peakDemandHours}
            />
          ) : null}

          {activeTab === 'schedule' ? (
            <SchedulePanel
              scheduleStats={scheduleStats}
              initialTrips={scheduleTrips}
              staff={staffMembers}
            />
          ) : null}

          {activeTab === 'reports' ? (
            <ReportsPanel
              financialStats={financialStats}
              financialRows={financialRows}
            />
          ) : null}

          {activeTab === 'staff' ? (
            <StaffPanel initialStaff={staffMembers} />
          ) : null}
        </div>
      </main>
    </div>
  )
}
