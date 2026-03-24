import { getDashboardData } from './data'
import { ReportingDashboard } from './ReportingDashboard'

export default async function ReportingPage() {
  const data = await getDashboardData()

  return (
    <div className="animate-fade-in">
      <ReportingDashboard data={data} />
    </div>
  )
}
