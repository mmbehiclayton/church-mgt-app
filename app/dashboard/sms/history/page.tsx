import HistoryClient from './HistoryClient'
import { getSmsCampaigns } from '@/app/sms/actions'

export const dynamic = 'force-dynamic'

export default async function HistoryPage() {
  const { campaigns, total } = await getSmsCampaigns({ take: 50 })
  return <HistoryClient campaigns={campaigns} total={total} />
}
