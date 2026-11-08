"use client";

import { useMemo, useState } from "react";
import { Share2, Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

interface ShareTransaction {
    id: string;
    amount: number;
    transactionDate: Date;
    categoryId: string;
    category: { name: string } | null;
    accountName: string | null;
    memberId?: string | null;
    memberName?: string | null;
}

interface ShareCategory {
    id: string;
    name: string;
    targetAmount?: number | null;
    paybill?: string | null;
    accountNumber?: string | null;
    shareNote?: string | null;
}

interface Settings {
    title: string;
    paybill: string;
    accNo: string;
    allocation: string;
    footer: string;
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

export function buildShareMessage(
    s: Settings,
    rows: { name: string; amount: number }[],
): string {
    const lines: string[] = [];
    lines.push(s.title.trim());
    lines.push("---------------------");
    if (s.paybill.trim()) lines.push(`PAYBILL: ${s.paybill.trim()}`);
    if (s.accNo.trim()) lines.push(`ACCNO:  ${s.accNo.trim()}`);
    lines.push("------------------");
    const alloc = Number(s.allocation.replace(/[^\d.]/g, ""));
    if (alloc > 0) lines.push(`Allocation -${fmt(alloc)}/=`);
    rows.forEach((r, i) => lines.push(`${i + 1}. ${r.name} -${Math.round(r.amount)}/=`));
    lines.push("");
    lines.push("");
    const total = rows.reduce((sum, r) => sum + r.amount, 0);
    lines.push(`TOTAL - ${fmt(total)}/=`);
    if (alloc > 0) {
        lines.push(total >= alloc ? "TARGET REACHED" : `BALANCE - ${fmt(alloc - total)}/=`);
    }
    if (s.footer.trim()) {
        lines.push("");
        lines.push(s.footer.trim());
    }
    return lines.join("\n");
}

export default function ShareContributions({ transactions, categoryDetails = [] }: { transactions: ShareTransaction[]; categoryDetails?: ShareCategory[] }) {
    const [open, setOpen] = useState(false);
    const [selectedId, setSelectedId] = useState("");
    const [overrides, setOverrides] = useState<Record<string, Partial<Settings>>>({});

    // Categories present in the currently filtered list
    const categories = useMemo(() => {
        const map = new Map<string, string>();
        for (const t of transactions) {
            if (t.categoryId && !map.has(t.categoryId)) map.set(t.categoryId, t.category?.name ?? "Uncategorized");
        }
        return [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    }, [transactions]);

    const categoryId = categories.some(c => c.id === selectedId) ? selectedId : (categories[0]?.id ?? "");

    // Defaults come from the category's saved details; edits here are one-off overrides
    const settings: Settings = useMemo(() => {
        const name = categories.find(c => c.id === categoryId)?.name ?? "";
        const d = categoryDetails.find(c => c.id === categoryId);
        return {
            title: name.toUpperCase(),
            paybill: d?.paybill ?? "",
            accNo: d?.accountNumber ?? "",
            allocation: d?.targetAmount ? String(d.targetAmount) : "",
            footer: d?.shareNote ?? "",
            ...overrides[categoryId],
        };
    }, [categories, categoryDetails, categoryId, overrides]);

    // One line per person: payments by the same member (or same name) are combined
    const rows = useMemo(() => {
        const byPerson = new Map<string, { name: string; amount: number; first: number }>();
        for (const t of transactions) {
            if (t.categoryId !== categoryId) continue;
            const name = (t.memberName || t.accountName || "Unknown").trim();
            const key = t.memberId || name.toLowerCase().replace(/\s+/g, " ");
            const time = new Date(t.transactionDate).getTime();
            const cur = byPerson.get(key);
            if (cur) {
                cur.amount += t.amount;
                cur.first = Math.min(cur.first, time);
            } else {
                byPerson.set(key, { name, amount: t.amount, first: time });
            }
        }
        return [...byPerson.values()].sort((a, b) => a.first - b.first);
    }, [transactions, categoryId]);

    const message = useMemo(() => buildShareMessage(settings, rows), [settings, rows]);

    function update<K extends keyof Settings>(key: K, value: string) {
        setOverrides(prev => ({ ...prev, [categoryId]: { ...prev[categoryId], [key]: value } }));
    }

    async function copy() {
        try {
            await navigator.clipboard.writeText(message);
            toast.success("Copied to clipboard");
        } catch {
            toast.error("Failed to copy");
        }
    }

    async function share() {
        if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
            try {
                await navigator.share({ text: message });
                return;
            } catch (e) {
                if ((e as Error).name === "AbortError") return;
            }
        }
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener");
    }

    if (transactions.length === 0) return null;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Share2 className="h-3.5 w-3.5 mr-1.5" /> Share
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Share contributions</DialogTitle>
                    <DialogDescription>
                        Formats the contributions of one category as a message you can send on WhatsApp.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="share-category">Category</Label>
                        <select
                            id="share-category"
                            value={categoryId}
                            onChange={e => setSelectedId(e.target.value)}
                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="share-title">Title</Label>
                        <Input id="share-title" value={settings.title} onChange={e => update("title", e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="share-paybill">Paybill</Label>
                            <Input id="share-paybill" value={settings.paybill} onChange={e => update("paybill", e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="share-acc">Account no.</Label>
                            <Input id="share-acc" value={settings.accNo} onChange={e => update("accNo", e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="share-alloc">Allocation (optional)</Label>
                        <Input
                            id="share-alloc" inputMode="numeric" value={settings.allocation}
                            onChange={e => update("allocation", e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="share-footer">Footer note (optional)</Label>
                        <Input id="share-footer" value={settings.footer} onChange={e => update("footer", e.target.value)} />
                    </div>

                    <div className="space-y-1.5">
                        <Label>Preview</Label>
                        <Textarea readOnly value={message} rows={12} className="font-mono text-xs" />
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={copy}>
                            <Copy className="h-4 w-4 mr-1.5" /> Copy
                        </Button>
                        <Button onClick={share}>
                            <MessageCircle className="h-4 w-4 mr-1.5" /> Share
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
