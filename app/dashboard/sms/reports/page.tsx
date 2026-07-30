import DeliveryReportsClient from './DeliveryReportsClient'
import { getDeliveryReport, getDeliveryReportCampaignOptions } from '@/app/sms/actions'

export const dynamic = 'force-dynamic'

export default async function DeliveryReportsPage() {
  const [report, campaigns] = await Promise.all([
    getDeliveryReport({}, { take: 50, skip: 0 }),
    getDeliveryReportCampaignOptions(),
  ])

  return (
    <DeliveryReportsClient
      initialMessages={report.success ? report.messages : []}
      initialTotal={report.success ? report.total : 0}
      initialCounts={report.success ? report.counts : { PENDING: 0, SENT: 0, DELIVERED: 0, FAILED: 0 }}
      initialError={report.success ? null : report.error}
      campaigns={campaigns}
    />
  )
}
