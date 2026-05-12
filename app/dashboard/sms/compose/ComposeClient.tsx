'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { analyzeSmsBody } from '@/lib/sms/segments'
import { previewSmsAudience, sendSmsCampaign } from '@/app/sms/actions'
import { usePermissions } from '@/hooks/usePermissions'
import { Send, Users, Search, ArrowLeft, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

type Option = { id: string; name: string; _count: { members: number } }

interface Template {
  id: string
  name: string
  body: string
  category: string | null
}

interface Props {
  departments: Option[]
  fellowships: Option[]
  totalMembers: number
  templates: Template[]
}

interface PreviewResult {
  totalRecipients: number
  matchedMembers: number
  invalidPhoneCount: number
  duplicateCount: number
  sample: { fullName: string | null; phoneNumber: string }[]
}

export default function ComposeClient({ departments, fellowships, totalMembers, templates }: Props) {
  const router = useRouter()
  const { hasPermission } = usePermissions()
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [allMembers, setAllMembers] = useState(false)
  const [selectedDepts, setSelectedDepts] = useState<Set<string>>(new Set())
  const [selectedFellowships, setSelectedFellowships] = useState<Set<string>>(new Set())
  const [genderMale, setGenderMale] = useState(false)
  const [genderFemale, setGenderFemale] = useState(false)
  const [extraPhones, setExtraPhones] = useState('')
  const [search, setSearch] = useState({ dept: '', fellowship: '' })
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const segInfo = useMemo(() => analyzeSmsBody(message), [message])

  const filteredDepts = useMemo(
    () => departments.filter(d => d.name.toLowerCase().includes(search.dept.toLowerCase())),
    [departments, search.dept]
  )
  const filteredFellowships = useMemo(
    () => fellowships.filter(f => f.name.toLowerCase().includes(search.fellowship.toLowerCase())),
    [fellowships, search.fellowship]
  )

  if (!hasPermission('sms', 'create')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="text-gray-500 mt-2">You don&apos;t have permission to send SMS.</p>
        </div>
      </div>
    )
  }

  const buildFilter = () => {
    const genders: string[] = []
    if (genderMale) genders.push('Male', 'MALE')
    if (genderFemale) genders.push('Female', 'FEMALE')
    const extras = extraPhones
      .split(/[\s,;\n]+/)
      .map(s => s.trim())
      .filter(Boolean)
    return {
      allMembers,
      departmentIds: Array.from(selectedDepts),
      fellowshipIds: Array.from(selectedFellowships),
      genders: genders.length > 0 ? genders : undefined,
      extraPhones: extras.length > 0 ? extras : undefined,
    }
  }

  const hasAnySelection = () =>
    allMembers ||
    selectedDepts.size > 0 ||
    selectedFellowships.size > 0 ||
    genderMale ||
    genderFemale ||
    extraPhones.trim().length > 0

  async function refreshPreview() {
    if (!hasAnySelection()) {
      setPreview(null)
      return
    }
    setPreviewLoading(true)
    const res = await previewSmsAudience(buildFilter())
    setPreviewLoading(false)
    if (!res.success) {
      toast.error(res.error || 'Failed to load preview')
      setPreview(null)
      return
    }
    setPreview({
      totalRecipients: res.totalRecipients,
      matchedMembers: res.matchedMembers,
      invalidPhoneCount: res.invalidPhoneCount,
      duplicateCount: res.duplicateCount,
      sample: res.sample.map(s => ({ fullName: s.fullName, phoneNumber: s.phoneNumber })),
    })
  }

  function applyTemplate(id: string) {
    const t = templates.find(x => x.id === id)
    if (!t) return
    setMessage(t.body)
    if (!name) setName(t.name)
  }

  function applyPreset(preset: 'men' | 'women' | 'youth' | 'pastors' | 'all') {
    setAllMembers(false)
    setSelectedDepts(new Set())
    setSelectedFellowships(new Set())
    setGenderMale(false)
    setGenderFemale(false)

    const findDept = (needle: string) =>
      departments.find(d => d.name.toLowerCase().includes(needle.toLowerCase()))?.id

    if (preset === 'all') {
      setAllMembers(true)
    } else if (preset === 'men') {
      const id = findDept('MEN')
      if (id) setSelectedDepts(new Set([id]))
      else setGenderMale(true)
    } else if (preset === 'women') {
      const id = findDept('WOMEN')
      if (id) setSelectedDepts(new Set([id]))
      else setGenderFemale(true)
    } else if (preset === 'youth') {
      const id = findDept('YOUTH')
      if (id) setSelectedDepts(new Set([id]))
    } else if (preset === 'pastors') {
      const id = findDept('PASTOR')
      if (id) setSelectedDepts(new Set([id]))
    }
  }

  function handleSend() {
    if (!message.trim()) {
      toast.error('Write a message first')
      return
    }
    if (!hasAnySelection()) {
      toast.error('Select at least one audience')
      return
    }
    if (!preview) {
      toast.error('Load the recipient preview first')
      return
    }
    if (preview.totalRecipients === 0) {
      toast.error('No valid recipients matched')
      return
    }
    setConfirmOpen(true)
  }

  function doSend() {
    setConfirmOpen(false)
    startTransition(async () => {
      const res = await sendSmsCampaign({
        message,
        name: name.trim() || undefined,
        filter: buildFilter(),
      })
      if (!res.success) {
        toast.error(res.error || 'Failed to send')
        return
      }
      toast.success(`Campaign sent: ${res.sentCount} sent, ${res.failedCount} failed`)
      router.push(`/dashboard/sms/history/${res.campaignId}`)
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/dashboard/sms">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
        <div className="ml-2">
          <h1 className="text-2xl font-bold">New SMS Campaign</h1>
          <p className="text-sm text-gray-500">Pick an audience, write your message, review, then send.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Audience column */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Audience
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quick presets */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => applyPreset('all')}>
                Entire Church
              </Button>
              <Button variant="outline" size="sm" onClick={() => applyPreset('men')}>
                Men
              </Button>
              <Button variant="outline" size="sm" onClick={() => applyPreset('women')}>
                Women
              </Button>
              <Button variant="outline" size="sm" onClick={() => applyPreset('youth')}>
                Youth
              </Button>
              <Button variant="outline" size="sm" onClick={() => applyPreset('pastors')}>
                Pastors
              </Button>
            </div>

            {/* Entire church */}
            <label className="flex items-center gap-3 p-3 border rounded-md cursor-pointer hover:bg-gray-50">
              <Checkbox checked={allMembers} onCheckedChange={v => setAllMembers(Boolean(v))} />
              <div className="flex-1">
                <div className="font-medium">Entire Church Membership</div>
                <div className="text-xs text-gray-500">{totalMembers.toLocaleString()} members</div>
              </div>
            </label>

            {/* Departments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Departments / Ministries</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    className="pl-7 h-8 text-xs w-56"
                    placeholder="Search departments..."
                    value={search.dept}
                    onChange={e => setSearch(s => ({ ...s, dept: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto p-2 border rounded-md">
                {filteredDepts.map(d => {
                  const checked = selectedDepts.has(d.id)
                  return (
                    <label
                      key={d.id}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded text-sm cursor-pointer',
                        checked ? 'bg-primary/10' : 'hover:bg-gray-50'
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={v => {
                          setSelectedDepts(prev => {
                            const next = new Set(prev)
                            if (v) next.add(d.id)
                            else next.delete(d.id)
                            return next
                          })
                        }}
                      />
                      <span className="flex-1 truncate" title={d.name}>{d.name}</span>
                      <span className="text-xs text-gray-400">{d._count.members}</span>
                    </label>
                  )
                })}
                {filteredDepts.length === 0 && (
                  <div className="col-span-full text-xs text-gray-400 text-center py-2">No departments</div>
                )}
              </div>
            </div>

            {/* Fellowships */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Home Fellowships</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    className="pl-7 h-8 text-xs w-56"
                    placeholder="Search fellowships..."
                    value={search.fellowship}
                    onChange={e => setSearch(s => ({ ...s, fellowship: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                {filteredFellowships.map(f => {
                  const checked = selectedFellowships.has(f.id)
                  return (
                    <label
                      key={f.id}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded text-sm cursor-pointer',
                        checked ? 'bg-primary/10' : 'hover:bg-gray-50'
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={v => {
                          setSelectedFellowships(prev => {
                            const next = new Set(prev)
                            if (v) next.add(f.id)
                            else next.delete(f.id)
                            return next
                          })
                        }}
                      />
                      <span className="flex-1 truncate" title={f.name}>{f.name}</span>
                      <span className="text-xs text-gray-400">{f._count.members}</span>
                    </label>
                  )
                })}
                {filteredFellowships.length === 0 && (
                  <div className="col-span-full text-xs text-gray-400 text-center py-2">No fellowships</div>
                )}
              </div>
            </div>

            {/* Gender */}
            <div>
              <Label className="mb-2 block">Gender filter (combines with above)</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={genderMale} onCheckedChange={v => setGenderMale(Boolean(v))} />
                  Male
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={genderFemale} onCheckedChange={v => setGenderFemale(Boolean(v))} />
                  Female
                </label>
              </div>
            </div>

            {/* Extra numbers */}
            <div>
              <Label className="mb-2 block">Additional phone numbers (comma or newline separated)</Label>
              <Textarea
                value={extraPhones}
                onChange={e => setExtraPhones(e.target.value)}
                rows={2}
                placeholder="0712345678, 0723456789"
              />
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div className="text-sm text-gray-600">
                Recipient counting deduplicates phone numbers and filters out invalid ones.
              </div>
              <Button onClick={refreshPreview} variant="outline" disabled={previewLoading || !hasAnySelection()}>
                {previewLoading ? 'Loading…' : 'Preview Recipients'}
              </Button>
            </div>

            {preview && (
              <div className="rounded-md border bg-gray-50 p-3 text-sm">
                <div className="flex flex-wrap gap-3 items-center">
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                    {preview.totalRecipients.toLocaleString()} recipients
                  </Badge>
                  <span className="text-xs text-gray-500">
                    Matched {preview.matchedMembers} members
                  </span>
                  {preview.invalidPhoneCount > 0 && (
                    <span className="text-xs text-amber-700">
                      {preview.invalidPhoneCount} skipped (invalid phone)
                    </span>
                  )}
                  {preview.duplicateCount > 0 && (
                    <span className="text-xs text-gray-500">
                      {preview.duplicateCount} duplicates collapsed
                    </span>
                  )}
                </div>
                {preview.sample.length > 0 && (
                  <div className="mt-2 text-xs text-gray-600">
                    Sample: {preview.sample.map(s => s.fullName || s.phoneNumber).slice(0, 5).join(', ')}
                    {preview.sample.length > 5 && '…'}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message column */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Message
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="campaign-name">Campaign Name (optional)</Label>
              <Input
                id="campaign-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Sunday Service Reminder"
                className="mt-1"
              />
            </div>

            {templates.length > 0 && (
              <div>
                <Label className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-3.5 w-3.5" /> Insert from template
                </Label>
                <Select onValueChange={applyTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} {t.category ? `· ${t.category}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="msg">Message body</Label>
              <Textarea
                id="msg"
                rows={9}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Hi {name}, kindly join us for Sunday service at 9am. - Church"
                className="mt-1 font-mono text-sm"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <div>
                  {segInfo.length} chars · {segInfo.segments} SMS ({segInfo.encoding})
                </div>
                <div>{segInfo.remaining} left in segment</div>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Placeholders: <code>{'{name}'}</code> <code>{'{phone}'}</code>
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleSend}
              disabled={isPending || !message.trim() || !preview || preview.totalRecipients === 0}
            >
              <Send className="h-4 w-4 mr-2" />
              {isPending ? 'Sending…' : `Send to ${preview?.totalRecipients ?? '—'} recipients`}
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              {preview && (
                <>
                  This will send <strong>{preview.totalRecipients}</strong> SMS, consuming roughly{' '}
                  <strong>{segInfo.segments * preview.totalRecipients}</strong> credits ({segInfo.segments} per recipient).
                  Once sent, messages cannot be recalled.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doSend}>Send</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
