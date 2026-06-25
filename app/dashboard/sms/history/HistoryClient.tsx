'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowRight, Plus, Search } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'

interface Campaign {
  id: string
  name: string | null
  message: string
  status: string
  totalRecipients: number
  sentCount: number
  deliveredCount: number
  failedCount: number
  totalSegments: number
  createdByName: string | null
  createdAt: Date | string
  completedAt: Date | string | null
}

const STATUS_STYLES: Record<string, string> = {
  SENT: 'bg-emerald-100 text-emerald-700',
  PARTIAL: 'bg-amber-100 text-amber-700',
  SENDING: 'bg-blue-100 text-blue-700',
  FAILED: 'bg-red-100 text-red-700',
  DRAFT: 'bg-gray-100 text-gray-600',
}

const STATUS_FILTERS = ['ALL', 'SENT', 'PARTIAL', 'SENDING', 'FAILED', 'DRAFT'] as const

export default function HistoryClient({ campaigns, total }: { campaigns: Campaign[]; total: number }) {
  const { hasPermission } = usePermissions()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('ALL')

  const filtered = useMemo(() => {
    return campaigns.filter(c => {
      if (status !== 'ALL' && c.status !== status) return false
      if (search) {
        const q = search.toLowerCase()
        const haystack = `${c.name ?? ''} ${c.message} ${c.createdByName ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [campaigns, search, status])

  if (!hasPermission('sms', 'read')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="text-gray-500 mt-2">You don&apos;t have permission to view SMS history.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SMS History</h1>
          <p className="text-sm text-gray-500">{total} campaigns total</p>
        </div>
        {hasPermission('sms', 'create') && (
          <Link href="/dashboard/sms/compose">
            <Button>
              <Plus className="h-4 w-4 mr-2" /> New Message
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>
              Campaigns
              {(search || status !== 'ALL') && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {filtered.length} of {campaigns.length}
                </span>
              )}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-8 h-9 w-56"
                  placeholder="Search name, message, sender..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {STATUS_FILTERS.map(s => (
                  <Button
                    key={s}
                    size="sm"
                    variant={status === s ? 'default' : 'outline'}
                    onClick={() => setStatus(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {campaigns.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No campaigns yet.
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No campaigns match your search or filter.
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(c => (
                <Link
                  key={c.id}
                  href={`/dashboard/sms/history/${c.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50"
                >
                  <div className="min-w-0 pr-4 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-gray-900 truncate">
                        {c.name || c.message.slice(0, 80)}
                      </div>
                      <Badge variant="secondary" className={STATUS_STYLES[c.status] || ''}>
                        {c.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500 truncate mt-0.5">{c.message}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      by {c.createdByName || 'system'} · {format(new Date(c.createdAt), 'MMM d, yyyy HH:mm')}
                    </div>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block mr-4">
                    <div className="text-sm font-medium">
                      {c.sentCount} / {c.totalRecipients} sent
                    </div>
                    <div className="text-xs text-gray-500">
                      {c.deliveredCount} delivered · {c.failedCount} failed
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
