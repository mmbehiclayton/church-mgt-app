import SmsDashboardClient from './SmsDashboardClient'
import { getSmsBalance, getSmsDashboardStats } from '@/app/sms/actions'

export const dynamic = 'force-dynamic'

export default async function SmsDashboardPage() {
  const [balanceRes, stats] = await Promise.all([
    getSmsBalance(),
    getSmsDashboardStats(),
  ])

  return (
    <SmsDashboardClient
      credits={balanceRes.credits}
      balanceError={balanceRes.error}
      stats={stats}
    />
  )
}
