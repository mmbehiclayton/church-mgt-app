'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, RefreshCw, Download, Search, Copy } from 'lucide-react'
import { refreshCampaignDelivery } from '@/app/sms/actions'
import { useRouter } from 'next/navigation'

interface Message {
  id: string
  phoneNumber: string
  recipientName: string | null
  status: string
  segments: number
  bongaUniqueId: string | null
  errorMessage: string | null
  deliveryStatusRaw: string | null
  sentAt: Date | string | null
  deliveredAt: Date | string | null
}

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
  startedAt: Date | string | null
  completedAt: Date | string | null
  messages: Message[]
}

const STATUS_STYLES: Record<string, string> = {
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  SENT: 'bg-blue-100 text-blue-700',
  PENDING: 'bg-muted text-muted-foreground',
  FAILED: 'bg-red-100 text-red-700',
}

export default function CampaignDetailClient({ campaign }: { campaign: Campaign }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('ALL')
  const [isPending, startTransition] = useTransition()
  const [lastSynced, setLastSynced] = useState<Date | null>(null)

  const filtered = useMemo(() => {
    return campaign.messages.filter(m => {
      if (filter !== 'ALL' && m.status !== filter) return false
      if (search) {
        const q = search.toLowerCase()
        if (!m.phoneNumber.toLowerCase().includes(q) && !(m.recipientName?.toLowerCase().includes(q))) {
          return false
        }
      }
      return true
    })
  }, [campaign.messages, search, filter])

  function exportCsv() {
    const headers = ['Name', 'Phone', 'Status', 'Sent At', 'Delivered At', 'Error', 'Carrier Status', 'Bonga ID']
    const rows = campaign.messages.map(m => [
      m.recipientName ?? '',
      m.phoneNumber,
      m.status,
      m.sentAt ? format(new Date(m.sentAt), 'yyyy-MM-dd HH:mm') : '',
      m.deliveredAt ? format(new Date(m.deliveredAt), 'yyyy-MM-dd HH:mm') : '',
      m.errorMessage ?? '',
      m.deliveryStatusRaw ?? '',
      m.bongaUniqueId ?? '',
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sms-campaign-${campaign.id}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function refresh() {
    startTransition(async () => {
      const res = await refreshCampaignDelivery(campaign.id)
      if (!res.success) {
        toast.error(res.error || 'Failed to refresh')
        return
      }
      setLastSynced(new Date())
      const suffix = res.remaining > 0 ? ` — ${res.remaining} still awaiting a report, click Sync again` : ''
      toast.success(`Updated ${res.updated} of ${res.processed} checked${suffix}`)
      router.refresh()
    })
  }

  function copyPhone(phone: string) {
    navigator.clipboard?.writeText(phone).then(
      () => toast.success('Phone number copied'),
      () => toast.error('Could not copy')
    )
  }

  const counts = useMemo(() => {
    const c = { DELIVERED: 0, SENT: 0, PENDING: 0, FAILED: 0 }
    for (const m of campaign.messages) {
      if (m.status in c) c[m.status as keyof typeof c]++
    }
    return c
  }, [campaign.messages])

  const totalTracked = counts.DELIVERED + counts.SENT + counts.PENDING + counts.FAILED
  const pct = (n: number) => (totalTracked > 0 ? (n / totalTracked) * 100 : 0)
  const deliverySegments = [
    { key: 'DELIVERED', label: 'Delivered', count: counts.DELIVERED, bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
    { key: 'SENT', label: 'Sent (awaiting report)', count: counts.SENT, bar: 'bg-blue-500', dot: 'bg-blue-500' },
    { key: 'PENDING', label: 'Pending', count: counts.PENDING, bar: 'bg-gray-300', dot: 'bg-gray-300' },
    { key: 'FAILED', label: 'Failed', count: counts.FAILED, bar: 'bg-red-500', dot: 'bg-red-500' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/dashboard/sms/history">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </Link>
          <div className="ml-2 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">
              {campaign.name || campaign.message.slice(0, 80)}
            </h1>
            <p className="text-xs text-muted-foreground">
              {campaign.createdByName || 'system'} · {format(new Date(campaign.createdAt), 'MMM d, yyyy HH:mm')}
              {campaign.completedAt && ` · completed ${format(new Date(campaign.completedAt), 'HH:mm')}`}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:items-end gap-1">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refresh} disabled={isPending}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? 'animate-spin' : ''}`} />
              Sync Delivery
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>
          {lastSynced && (
            <span className="text-[11px] text-muted-foreground/70">Last synced {format(lastSynced, 'HH:mm:ss')}</span>
          )}
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <Card className="col-span-2 md:col-span-1">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Status</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <Badge className={STATUS_STYLES[campaign.status] || 'bg-muted text-muted-foreground'}>{campaign.status}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Recipients</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><div className="text-2xl font-bold">{campaign.totalRecipients}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-emerald-700">Delivered</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><div className="text-2xl font-bold">{counts.DELIVERED}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-blue-700">Awaiting report</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><div className="text-2xl font-bold">{counts.SENT}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-red-700">Failed</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><div className="text-2xl font-bold">{counts.FAILED}</div></CardContent>
        </Card>
      </div>

      {/* Delivery progress */}
      {totalTracked > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Delivery progress</span>
              <span className="text-xs text-muted-foreground">
                {counts.DELIVERED} of {totalTracked} delivered
                {counts.PENDING + counts.SENT > 0 && ' · sync to refresh carrier status'}
              </span>
            </div>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
              {deliverySegments.map(s =>
                s.count > 0 ? (
                  <div key={s.key} className={s.bar} style={{ width: `${pct(s.count)}%` }} title={`${s.label}: ${s.count}`} />
                ) : null
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {deliverySegments.map(s => (
                <div key={s.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                  {s.label} <span className="font-medium text-foreground">{s.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Message</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap font-mono text-sm bg-muted/40 p-3 rounded border">{campaign.message}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <CardTitle>Recipients ({filtered.length})</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                <Input
                  className="pl-8 h-10 sm:h-9 w-full text-base sm:text-sm"
                  placeholder="Search name or phone..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-0.5">
              {(['ALL', 'DELIVERED', 'SENT', 'PENDING', 'FAILED'] as const).map(s => (
                <Button
                  key={s}
                  size="sm"
                  className="shrink-0"
                  variant={filter === s ? 'default' : 'outline'}
                  onClick={() => setFilter(s)}
                >
                  {s}
                </Button>
              ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Phones: one card per recipient */}
          <ul className="md:hidden divide-y divide-border">
            {filtered.length === 0 ? (
              <li className="text-center text-sm text-muted-foreground/70 py-8">No messages match this filter</li>
            ) : (
              filtered.map(m => (
                <li key={m.id} className="px-4 py-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{m.recipientName || '—'}</span>
                    <Badge variant="secondary" className={STATUS_STYLES[m.status] || ''}>{m.status}</Badge>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyPhone(m.phoneNumber)}
                    className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground active:text-primary py-0.5"
                  >
                    {m.phoneNumber}
                    <Copy className="h-3 w-3" />
                  </button>
                  <div className="text-[11px] text-muted-foreground">
                    {m.deliveredAt
                      ? `Delivered ${format(new Date(m.deliveredAt), 'MMM d, HH:mm')}`
                      : m.sentAt
                        ? `Sent ${format(new Date(m.sentAt), 'MMM d, HH:mm')}`
                        : 'Not sent yet'}
                    {m.status === 'SENT' && m.deliveryStatusRaw && ` · carrier: ${m.deliveryStatusRaw}`}
                  </div>
                  {m.errorMessage && <div className="text-xs text-red-600">{m.errorMessage}</div>}
                </li>
              ))
            )}
          </ul>

          {/* Tablet / desktop: table */}
          <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Delivered</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground/70 py-8">No messages match this filter</TableCell></TableRow>
              ) : (
                filtered.map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.recipientName || '—'}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => copyPhone(m.phoneNumber)}
                        className="group inline-flex items-center gap-1 font-mono text-xs hover:text-primary"
                        title="Copy phone number"
                      >
                        {m.phoneNumber}
                        <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={STATUS_STYLES[m.status] || ''}>{m.status}</Badge>
                      {m.status === 'SENT' && m.deliveryStatusRaw && (
                        <div className="text-[11px] text-muted-foreground/70 mt-0.5" title="Raw carrier report — not yet a final status">
                          carrier: {m.deliveryStatusRaw}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.sentAt ? format(new Date(m.sentAt), 'MMM d, HH:mm:ss') : '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.deliveredAt ? format(new Date(m.deliveredAt), 'MMM d, HH:mm:ss') : '—'}</TableCell>
                    <TableCell className="text-xs text-red-600 max-w-xs truncate" title={m.errorMessage ?? ''}>{m.errorMessage || ''}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
