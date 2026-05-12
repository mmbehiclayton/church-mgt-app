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
import { ArrowLeft, RefreshCw, Download, Search } from 'lucide-react'
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
  PENDING: 'bg-gray-100 text-gray-600',
  FAILED: 'bg-red-100 text-red-700',
}

export default function CampaignDetailClient({ campaign }: { campaign: Campaign }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('ALL')
  const [isPending, startTransition] = useTransition()

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
    const headers = ['Name', 'Phone', 'Status', 'Sent At', 'Delivered At', 'Error', 'Bonga ID']
    const rows = campaign.messages.map(m => [
      m.recipientName ?? '',
      m.phoneNumber,
      m.status,
      m.sentAt ? format(new Date(m.sentAt), 'yyyy-MM-dd HH:mm') : '',
      m.deliveredAt ? format(new Date(m.deliveredAt), 'yyyy-MM-dd HH:mm') : '',
      m.errorMessage ?? '',
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
      toast.success(`Updated ${res.updated} delivery statuses`)
      router.refresh()
    })
  }

  const counts = useMemo(() => {
    const c = { DELIVERED: 0, SENT: 0, PENDING: 0, FAILED: 0 }
    for (const m of campaign.messages) {
      if (m.status in c) c[m.status as keyof typeof c]++
    }
    return c
  }, [campaign.messages])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/dashboard/sms/history">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </Link>
          <div className="ml-2 min-w-0">
            <h1 className="text-2xl font-bold truncate">
              {campaign.name || campaign.message.slice(0, 80)}
            </h1>
            <p className="text-xs text-gray-500">
              {campaign.createdByName || 'system'} · {format(new Date(campaign.createdAt), 'MMM d, yyyy HH:mm')}
              {campaign.completedAt && ` · completed ${format(new Date(campaign.completedAt), 'HH:mm')}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? 'animate-spin' : ''}`} />
            Sync Delivery
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Status</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <Badge className={STATUS_STYLES[campaign.status] || 'bg-gray-100 text-gray-700'}>{campaign.status}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Recipients</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><div className="text-2xl font-bold">{campaign.totalRecipients}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Sent</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><div className="text-2xl font-bold">{campaign.sentCount + counts.DELIVERED}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Delivered</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><div className="text-2xl font-bold">{counts.DELIVERED}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Failed</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0"><div className="text-2xl font-bold">{counts.FAILED}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Message</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-3 rounded border">{campaign.message}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Recipients ({filtered.length})</CardTitle>
            <div className="flex items-center gap-2">
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
                <Button
                  key={s}
                  size="sm"
                  variant={filter === s ? 'default' : 'outline'}
                  onClick={() => setFilter(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
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
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-gray-400 py-8">No messages match this filter</TableCell></TableRow>
              ) : (
                filtered.map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.recipientName || '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{m.phoneNumber}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={STATUS_STYLES[m.status] || ''}>{m.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-gray-600">{m.sentAt ? format(new Date(m.sentAt), 'MMM d, HH:mm:ss') : '—'}</TableCell>
                    <TableCell className="text-xs text-gray-600">{m.deliveredAt ? format(new Date(m.deliveredAt), 'MMM d, HH:mm:ss') : '—'}</TableCell>
                    <TableCell className="text-xs text-red-600 max-w-xs truncate" title={m.errorMessage ?? ''}>{m.errorMessage || ''}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
