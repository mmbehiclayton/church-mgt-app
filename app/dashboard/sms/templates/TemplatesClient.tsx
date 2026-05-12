'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
import { ArrowLeft, Plus, Trash2, Pencil } from 'lucide-react'
import { analyzeSmsBody } from '@/lib/sms/segments'
import { createSmsTemplate, updateSmsTemplate, deleteSmsTemplate } from '@/app/sms/actions'
import { usePermissions } from '@/hooks/usePermissions'
import { useRouter } from 'next/navigation'

interface Template {
  id: string
  name: string
  body: string
  category: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

const STARTER_CATEGORIES = [
  'Sunday Service',
  'Prayer Meeting',
  'Fellowship Meeting',
  'Fundraiser',
  'Event Announcement',
  'Emergency Alert',
  'Birthday',
  'Contribution Reminder',
]

export default function TemplatesClient({ templates }: { templates: Template[] }) {
  const router = useRouter()
  const { hasPermission } = usePermissions()
  const canManage = hasPermission('sms', 'manage')

  const [editing, setEditing] = useState<Template | null>(null)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState({ name: '', category: '', body: '' })

  if (!hasPermission('sms', 'read')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="text-gray-500 mt-2">You don&apos;t have permission to view templates.</p>
        </div>
      </div>
    )
  }

  function openCreate() {
    setForm({ name: '', category: '', body: '' })
    setEditing(null)
    setCreating(true)
  }
  function openEdit(t: Template) {
    setForm({ name: t.name, category: t.category || '', body: t.body })
    setEditing(t)
    setCreating(true)
  }
  function closeModal() {
    setCreating(false)
    setEditing(null)
  }

  function submit() {
    if (!form.name.trim() || !form.body.trim()) {
      toast.error('Name and body are required')
      return
    }
    startTransition(async () => {
      const payload = { name: form.name.trim(), body: form.body, category: form.category.trim() || undefined }
      const res = editing
        ? await updateSmsTemplate(editing.id, payload)
        : await createSmsTemplate(payload)
      if ('error' in res && res.error) {
        toast.error(res.error)
        return
      }
      toast.success(editing ? 'Template updated' : 'Template created')
      closeModal()
      router.refresh()
    })
  }

  function confirmDelete() {
    if (!deletingId) return
    startTransition(async () => {
      const res = await deleteSmsTemplate(deletingId)
      if ('error' in res && res.error) {
        toast.error(res.error)
        return
      }
      toast.success('Template deleted')
      setDeletingId(null)
      router.refresh()
    })
  }

  const segInfo = analyzeSmsBody(form.body)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/sms">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </Link>
          <div className="ml-2">
            <h1 className="text-2xl font-bold">SMS Templates</h1>
            <p className="text-sm text-gray-500">Reusable messages for common scenarios</p>
          </div>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> New Template
          </Button>
        )}
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No templates yet. {canManage && 'Click "New Template" to add one.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map(t => {
            const seg = analyzeSmsBody(t.body)
            return (
              <Card key={t.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{t.name}</CardTitle>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(t)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeletingId(t.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {t.category && (
                    <Badge variant="secondary" className="w-fit text-xs">{t.category}</Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-2 rounded border max-h-32 overflow-y-auto font-mono">
                    {t.body}
                  </pre>
                  <div className="text-xs text-gray-400 mt-2">
                    {seg.length} chars · {seg.segments} SMS ({seg.encoding})
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={creating} onOpenChange={open => (open ? null : closeModal())}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Template' : 'New Template'}</DialogTitle>
            <DialogDescription>
              Use placeholders like <code>{'{name}'}</code> to personalize.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tpl-name">Name</Label>
              <Input id="tpl-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="tpl-cat">Category</Label>
              <Input
                id="tpl-cat"
                list="tpl-categories"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="mt-1"
                placeholder="Sunday Service"
              />
              <datalist id="tpl-categories">
                {STARTER_CATEGORIES.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <Label htmlFor="tpl-body">Message</Label>
              <Textarea
                id="tpl-body"
                rows={6}
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                className="mt-1 font-mono text-sm"
              />
              <div className="text-xs text-gray-500 mt-1">
                {segInfo.length} chars · {segInfo.segments} SMS ({segInfo.encoding})
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal} disabled={isPending}>Cancel</Button>
            <Button onClick={submit} disabled={isPending}>
              {isPending ? 'Saving…' : editing ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={open => (open ? null : setDeletingId(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Existing campaigns that used this template are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
