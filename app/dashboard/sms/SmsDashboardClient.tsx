'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usePermissions } from '@/hooks/usePermissions'
import {
  Wallet,
  Send,
  CheckCircle2,
  XCircle,
  Users,
  Plus,
  ArrowRight,
  RefreshCw,
  FileText,
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

export default function SmsDashboardClient({ credits, balanceError, stats }: Props) {
  const { hasPermission } = usePermissions()

  if (!hasPermission('sms', 'read')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="text-gray-500 mt-2">You don&apos;t have permission to view SMS.</p>
        </div>
      </div>
    )
  }

  const canSend = hasPermission('sms', 'create')
  const lowBalance = credits !== null && credits < 50

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">SMS</h1>
          <p className="text-gray-500 mt-1">Send messages to groups, departments and fellowships.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/sms/templates">
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Templates
            </Button>
          </Link>
          <Link href="/dashboard/sms/history">
            <Button variant="outline">
              History
            </Button>
          </Link>
          {canSend && (
            <Link href="/dashboard/sms/compose">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Message
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className={lowBalance ? 'border-amber-300' : undefined}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-sm font-medium">SMS Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {balanceError ? (
              <div>
                <div className="text-2xl font-bold text-red-600">—</div>
                <p className="text-xs text-red-500 truncate" title={balanceError}>{balanceError}</p>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{credits?.toLocaleString() ?? '—'}</div>
                <p className="text-xs text-muted-foreground">
                  {lowBalance ? 'Low balance — top up soon' : 'Credits remaining'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{stats.totalSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across {stats.totalCampaigns} campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{stats.totalDelivered.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Confirmed by carrier</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{stats.totalFailed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{stats.totalPending} pending</p>
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
                  className="flex items-center justify-between p-4 hover:bg-gray-50"
                >
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-gray-900 truncate">
                        {c.name || c.message.slice(0, 60)}
                      </div>
                      <Badge className={STATUS_STYLES[c.status] || ''} variant="secondary">
                        {c.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500 truncate mt-0.5">
                      {c.message}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {c.createdByName || 'system'} • {format(new Date(c.createdAt), 'MMM d, yyyy HH:mm')}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-medium">
                      {c.sentCount} / {c.totalRecipients}
                    </div>
                    <div className="text-xs text-gray-500">
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
