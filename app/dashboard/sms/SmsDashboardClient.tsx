'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usePermissions } from '@/hooks/usePermissions'
import { AccessDenied } from '@/components/ui/access-denied'
import {
  Wallet,
  Send,
  CheckCircle2,
  XCircle,
  Users,
  Plus,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface RecentCampaign {
  id: string
  name: string | null
  message: string
  status: string
  totalRecipients: number
  sentCount: number
  deliveredCount: number
  failedCount: number
  createdByName: string | null
  createdAt: Date | string
}

interface Stats {
  totalCampaigns: number
  totalSent: number
  totalDelivered: number
  totalFailed: number
  totalPending: number
  trend: { date: string; sent: number; failed: number }[]
  recent: RecentCampaign[]
}

interface Props {
  credits: number | null
  threshold: number | null
  clientName: string | null
  balanceError: string | null
  stats: Stats
}

const STATUS_STYLES: Record<string, string> = {
  SENT: 'bg-emerald-100 text-emerald-700',
  PARTIAL: 'bg-amber-100 text-amber-700',
  SENDING: 'bg-blue-100 text-blue-700',
  FAILED: 'bg-red-100 text-red-700',
  DRAFT: 'bg-gray-100 text-gray-600',
}

export default function SmsDashboardClient({ credits, threshold, clientName, balanceError, stats }: Props) {
  const { hasPermission } = usePermissions()

  if (!hasPermission('sms', 'read')) {
    return (
      <div className="flex items-center justify-center h-64">
        <AccessDenied description="You don't have permission to view SMS." />
      </div>
    )
  }

  const canSend = hasPermission('sms', 'create')
  const effectiveThreshold = threshold && threshold > 0 ? threshold : 50
  const lowBalance = credits !== null && credits < effectiveThreshold
  const criticalBalance = credits !== null && credits < 10

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SMS</h1>
          <p className="text-muted-foreground mt-1">Send messages to groups, departments and fellowships.</p>
        </div>
        {canSend && (
          <Link href="/dashboard/sms/compose">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Message
            </Button>
          </Link>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card className={criticalBalance ? 'border-red-400' : lowBalance ? 'border-amber-300' : undefined}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">SMS Balance</span>
              <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            {balanceError ? (
              <>
                <div className="text-xl font-bold text-red-600 mt-1">—</div>
                <p className="text-xs text-red-500 truncate mt-0.5" title={balanceError}>{balanceError}</p>
              </>
            ) : (
              <>
                <div className={`text-xl font-bold mt-1 tabular-nums ${criticalBalance ? 'text-red-600' : lowBalance ? 'text-amber-600' : ''}`}>
                  {credits?.toLocaleString() ?? '—'}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {criticalBalance
                    ? 'Critical — top up now'
                    : lowBalance
                      ? 'Low — top up soon'
                      : clientName || 'Credits remaining'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Messages Sent</span>
              <Send className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="text-xl font-bold mt-1 tabular-nums">{stats.totalSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-0.5">{stats.totalCampaigns} campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Delivered</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-bold mt-1 tabular-nums">{stats.totalDelivered.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Confirmed by carrier</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Failed</span>
              <XCircle className="h-3.5 w-3.5 text-red-600" />
            </div>
            <div className="text-xl font-bold mt-1 tabular-nums">{stats.totalFailed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-0.5">{stats.totalPending} pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Trend chart */}
      <Card>
        <CardHeader>
          <CardTitle>Last 7 days</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.trend.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
              No SMS activity yet
            </div>
          ) : (
            <div className="w-full" style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sent" stackId="a" fill="#10b981" name="Sent" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Failed" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Recent Campaigns
          </CardTitle>
          <Link href="/dashboard/sms/history">
            <Button variant="ghost" size="sm">
              View all <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {stats.recent.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No campaigns yet.{' '}
              {canSend && (
                <Link href="/dashboard/sms/compose" className="text-primary underline">
                  Send your first message
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {stats.recent.map(c => (
                <Link
                  key={c.id}
                  href={`/dashboard/sms/history/${c.id}`}
                  className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="font-medium truncate">
                        {c.name || c.message.slice(0, 60)}
                      </div>
                      <Badge className={STATUS_STYLES[c.status] || ''} variant="secondary">
                        {c.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground truncate mt-0.5">
                      {c.message}
                    </div>
                    <div className="text-xs text-muted-foreground/70 mt-1">
                      {c.createdByName || 'system'} • {format(new Date(c.createdAt), 'MMM d, yyyy HH:mm')}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-medium tabular-nums">
                      {c.sentCount} / {c.totalRecipients}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.deliveredCount} delivered • {c.failedCount} failed
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {balanceError && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-3">
          <RefreshCw className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <div className="font-medium">Could not reach Bonga SMS API</div>
            <div className="text-amber-800 mt-1">
              Check your <code className="text-xs">BONGA_SMS_*</code> environment variables and that the Bonga API is reachable. You can still browse history.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
