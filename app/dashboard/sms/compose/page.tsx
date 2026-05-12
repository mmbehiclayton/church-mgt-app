import ComposeClient from './ComposeClient'
import { getSmsComposerOptions, getSmsTemplates } from '@/app/sms/actions'

export const dynamic = 'force-dynamic'

export default async function ComposePage() {
  const [options, templates] = await Promise.all([
    getSmsComposerOptions(),
    getSmsTemplates(),
  ])

  return (
    <ComposeClient
      departments={options.departments}
      fellowships={options.fellowships}
      totalMembers={options.memberCount}
      templates={templates.map(t => ({ id: t.id, name: t.name, body: t.body, category: t.category }))}
    />
  )
}
