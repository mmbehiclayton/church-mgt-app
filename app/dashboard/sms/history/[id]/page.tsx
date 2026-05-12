import { notFound } from 'next/navigation'
import CampaignDetailClient from './CampaignDetailClient'
import { getSmsCampaignById } from '@/app/sms/actions'

export const dynamic = 'force-dynamic'

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const campaign = await getSmsCampaignById(id)
  if (!campaign) notFound()
  return <CampaignDetailClient campaign={campaign} />
}
