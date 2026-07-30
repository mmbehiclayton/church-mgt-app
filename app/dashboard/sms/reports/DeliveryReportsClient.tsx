'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, RefreshCw, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { getDeliveryReport, syncAllPendingDeliveriesAction, type DeliveryReportFilter } from '@/app/sms/actions'

interface CampaignOption {
  id: string
  name: string | null
  message: string
}

interface ReportRow {
  id: string
  phoneNumber: string
  recipientName: string | null
  status: string
  deliveryStatusRaw: string | null
  errorMessage: string | null
  sentAt: Date | string | null
  deliveredAt: Date | string | null
  createdAt: Date | string
  campaign: { id: string; name: string | null; message: string } | null
}

interface Counts {
  PENDING: number
  SENT: number
  DELIVERED: number
  FAILED: number
}

interface Props {
  initialMessages: ReportRow[]
  initialTotal: number
  initialCounts: Counts
  initialError: string | null
  campaigns: CampaignOption[]
}

const STATUS_STYLES: Record<string, string> = {
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  SENT: 'bg-blue-100 text-blue-700',
  PENDING: 'bg-gray-100 text-gray-600',
  FAILED: 'bg-red-100 text-red-700',
}

const PAGE_SIZE = 50

export default function DeliveryReportsClient({
  initialMessages,
  initialTotal,
  initialCounts,
  initialError,
  campaigns,
}: Props) {
  const [messages, setMessages] = useState(initialMessages)
  const [total, setTotal] = useState(initialTotal)
  const [counts, setCounts] = useState(initialCounts)
  const [loadError, setLoadError] = useState(initialError)
  const [loading, setLoading] = useState(false)
  const [isSyncing, startSyncTransition] = useTransition()
  const [lastSynced, setLastSynced] = useState<Date | null>(null)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('ALL')
  const [campaignId, setCampaignId] = useState<string>('ALL')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(0)

  const filter: DeliveryReportFilter = useMemo(
    () => ({
      status: status === 'ALL' ? undefined : (status as DeliveryReportFilter['status']),
      campaignId: campaignId === 'ALL' ? undefined : campaignId,
      search: search.trim() || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [status, campaignId, search, from, to]
  )

  // Whenever a filter changes, debounce and reload from page 0.
  useEffect(() => {
    let ignore = false
    setLoading(true)
    const handle = setTimeout(async () => {
      const res = await getDeliveryReport(filter, { take: PAGE_SIZE, skip: 0 })
      if (ignore) return
      setLoading(false)
      setPage(0)
      if (!res.success) {
        setLoadError(res.error)
        return
      }
      setLoadError(null)
      setMessages(res.messages)
      setTotal(res.total)
      setCounts(res.counts)
    }, 350)
    return () => {
      ignore = true
      clearTimeout(handle)
    }
  }, [filter])

  async function goToPage(nextPage: number) {
    setLoading(true)
    const res = await getDeliveryReport(filter, { take: PAGE_SIZE, skip: nextPage * PAGE_SIZE })
    setLoading(false)
    if (!res.success) {
      toast.error(res.error || 'Failed to load page')
      return
    }
    setPage(nextPage)
    setMessages(res.messages)
    setTotal(res.total)
    setCounts(res.counts)
  }

  function syncAllPending() {
    startSyncTransition(async () => {
      const res = await syncAllPendingDeliveriesAction()
      if (!res.success) {
        toast.error(res.error || 'Failed to sync')
        return
      }
      setLastSynced(new Date())
      const suffix =
        res.remaining > 0 ? ` — ${res.remaining} still awaiting a report, run again to continue` : ''
      toast.success(`Updated ${res.updated} of ${res.processed} checked${suffix}`)
      const refreshed = await getDeliveryReport(filter, { take: PAGE_SIZE, skip: page * PAGE_SIZE })
      if (refreshed.success) {
        setMessages(refreshed.messages)
        setTotal(refreshed.total)
        setCounts(refreshed.counts)
      }
    })
  }

  async function exportCsv() {
    const res = await getDeliveryReport(filter, { take: 5000, skip: 0 })
    if (!res.success) {
      toast.error(res.error || 'Failed to export')
      return
    }
    const headers = ['Name', 'Phone', 'Campaign', 'Status', 'Sent At', 'Delivered At', 'Error', 'Carrier Status']
    const rows = res.messages.map(m => [
      m.recipientName ?? '',
      m.phoneNumber,
      m.campaign?.name || m.campaign?.message?.slice(0, 40) || '',
      m.status,
      m.sentAt ? format(new Date(m.sentAt), 'yyyy-MM-dd HH:mm') : '',
      m.deliveredAt ? format(new Date(m.deliveredAt), 'yyyy-MM-dd HH:mm') : '',
      m.errorMessage ?? '',
      m.deliveryStatusRaw ?? '',
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sms-delivery-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    if (res.total > 5000) {
      toast.info(`Exported first 5,000 of ${res.total.toLocaleString()} matching rows — narrow your filters to get the rest`)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Delivery Reports</h1>
          <p className="text-sm text-gray-500">Message-level delivery status across every campaign.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={syncAllPending} disabled={isSyncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync all pending
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {lastSynced && <p className="text-xs text-gray-400 -mt-4">Last synced {format(lastSynced, 'HH:mm:ss')}</p>}

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {(['DELIVERED', 'SENT', 'PENDING', 'FAILED'] as const).map(s => (
          <Card key={s}>
            <CardContent className="p-3">
              <div className="text-xs font-medium text-muted-foreground">
                {s === 'SENT' ? 'Awaiting report' : s.charAt(0) + s.slice(1).toLowerCase()}
              </div>
              <div className="text-xl font-bold mt-1 tabular-nums">{counts[s].toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-8 h-9 w-56"
                placeholder="Search name or phone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {(['ALL', 'DELIVERED', 'SENT', 'PENDING', 'FAILED'] as const).map(s => (
              <Button key={s} size="sm" variant={status === s ? 'default' : 'outline'} onClick={() => setStatus(s)}>
                {s}
              </Button>
            ))}
            <Select value={campaignId} onValueChange={setCampaignId}>
              <SelectTrigger className="h-9 w-56">
                <SelectValue placeholder="All campaigns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All campaigns</SelectItem>
                {campaigns.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name || c.message.slice(0, 40)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 text-sm">
              <Label htmlFor="from" className="text-xs text-muted-foreground">From</Label>
              <Input id="from" type="date" className="h-9 w-36" value={from} onChange={e => setFrom(e.target.value)} />
              <Label htmlFor="to" className="text-xs text-muted-foreground ml-2">To</Label>
              <Input id="to" type="date" className="h-9 w-36" value={to} onChange={e => setTo(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadError ? (
            <div className="p-10 text-center text-sm text-red-600">{loadError}</div>
          ) : loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
          ) : messages.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No messages match these filters.</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Delivered</TableHead>
                    <TableHead>Error / Carrier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.recipientName || '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{m.phoneNumber}</TableCell>
                      <TableCell className="max-w-45 truncate text-sm">
                        {m.campaign ? (
                          <Link href={`/dashboard/sms/history/${m.campaign.id}`} className="hover:underline">
                            {m.campaign.name || m.campaign.message.slice(0, 40)}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={STATUS_STYLES[m.status] || ''}>
                          {m.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">
                        {m.sentAt ? format(new Date(m.sentAt), 'MMM d, HH:mm:ss') : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">
                        {m.deliveredAt ? format(new Date(m.deliveredAt), 'MMM d, HH:mm:ss') : '—'}
                      </TableCell>
                      <TableCell
                        className="text-xs max-w-xs truncate"
                        title={m.errorMessage || m.deliveryStatusRaw || ''}
                      >
                        <span className={m.errorMessage ? 'text-red-600' : 'text-gray-400'}>
                          {m.errorMessage || m.deliveryStatusRaw || ''}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between p-3 border-t text-sm">
                <span className="text-muted-foreground">
                  {total.toLocaleString()} messages · page {page + 1} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0 || loading} onClick={() => goToPage(page - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page + 1 >= totalPages || loading}
                    onClick={() => goToPage(page + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
