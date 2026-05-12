import TemplatesClient from './TemplatesClient'
import { getSmsTemplates } from '@/app/sms/actions'

export const dynamic = 'force-dynamic'

export default async function TemplatesPage() {
  const templates = await getSmsTemplates()
  return <TemplatesClient templates={templates} />
}
