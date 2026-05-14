"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { parseMpesaMessage, ParsedTransaction } from "@/lib/parser";
import { saveTransaction, updateTransaction, searchMembers } from "@/app/actions";
import { toast } from "sonner";
import { Search, X, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
    id: string;
    name: string;
}

interface TransactionData {
    id?: string;
    reference: string;
    amount: number;
    transactionDate: Date;
    transactionTime?: string | null;
    bank?: string | null;
    paybill?: string | null;
    account?: string | null;
    accountName?: string | null;
    rawMessage: string;
    categoryId: string;
    memberId?: string | null;
    memberName?: string | null;
}

interface MemberResult {
    id: string;
    fullName: string;
    phoneNumber: string;
}

export default function TransactionForm({
    categories,
    onSuccess,
    initialData,
}: {
    categories: Category[];
    onSuccess?: () => void;
    initialData?: TransactionData;
}) {
    const router = useRouter();
    const [message, setMessage] = useState(initialData?.rawMessage || "");
    const [categoryId, setCategoryId] = useState(initialData?.categoryId || "");
    const [loading, setLoading] = useState(false);

    // Member search state
    const [memberQuery, setMemberQuery] = useState(initialData?.memberName || "");
    const [memberResults, setMemberResults] = useState<MemberResult[]>([]);
    const [selectedMember, setSelectedMember] = useState<MemberResult | null>(
        initialData?.memberId ? { id: initialData.memberId, fullName: initialData.memberName ?? "", phoneNumber: "" } : null
    );
    const [memberSearching, setMemberSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const memberSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const parsed: Partial<ParsedTransaction> = useMemo(() => {
        if (message.trim().length > 10) return parseMpesaMessage(message) || {};
        return {};
    }, [message]);

    // Debounced member search
    const doSearch = useCallback(async (q: string) => {
        if (!q.trim() || selectedMember) { setMemberResults([]); setShowDropdown(false); return; }
        setMemberSearching(true);
        const results = await searchMembers(q);
        setMemberResults(results);
        setShowDropdown(results.length > 0);
        setMemberSearching(false);
    }, [selectedMember]);

    useEffect(() => {
        if (memberSearchTimer.current) clearTimeout(memberSearchTimer.current);
        memberSearchTimer.current = setTimeout(() => doSearch(memberQuery), 300);
        return () => { if (memberSearchTimer.current) clearTimeout(memberSearchTimer.current); };
    }, [memberQuery, doSearch]);

    // Close dropdown on outside click
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    function selectMember(m: MemberResult) {
        setSelectedMember(m);
        setMemberQuery(m.fullName);
        setMemberResults([]);
        setShowDropdown(false);
    }

    function clearMember() {
        setSelectedMember(null);
        setMemberQuery("");
        setMemberResults([]);
        setShowDropdown(false);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const effectiveRef = parsed.reference || initialData?.reference;
        if (!categoryId || !effectiveRef) {
            toast.error("Please select a category and ensure the M-Pesa message is valid.");
            return;
        }

        setLoading(true);

        const payload = {
            categoryId,
            amount: parsed.amount ?? initialData?.amount ?? 0,
            reference: parsed.reference ?? initialData?.reference ?? "",
            transactionDate: parsed.transactionDate ?? initialData?.transactionDate ?? new Date(),
            transactionTime: parsed.transactionTime ?? initialData?.transactionTime,
            bank: parsed.paymentMethod || initialData?.bank || "KCB",
            paybill: parsed.paymentMethod?.includes("Pay Bill") ? parsed.paymentMethod : (initialData?.paybill || null),
            account: parsed.account ?? initialData?.account,
            accountName: parsed.accountName ?? initialData?.accountName,
            rawMessage: message,
            memberId: selectedMember?.id ?? null,
            memberName: selectedMember?.fullName ?? null,
        };

        let res;
        if (initialData?.id) {
            res = await updateTransaction(initialData.id, payload);
        } else {
            res = await saveTransaction(payload);
        }

        setLoading(false);

        if (res.success) {
            toast.success(initialData ? "Transaction updated!" : "Transaction saved!");
            if (!initialData) {
                setMessage("");
                setCategoryId("");
                clearMember();
            }
            router.refresh();
            onSuccess?.();
        } else {
            toast.error(res.error || "Failed to save transaction");
        }
    };

    const hasRef = !!(parsed.reference || initialData?.reference);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* M-Pesa message */}
            <div className="space-y-1.5">
                <Label>M-Pesa Message</Label>
                <Textarea
                    placeholder="Paste your M-Pesa confirmation message here…"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="h-28 font-mono text-sm resize-none"
                />
            </div>

            {/* Parsed fields */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label>Amount (Ksh)</Label>
                    <Input
                        value={parsed.amount != null ? parsed.amount.toLocaleString() : (initialData?.amount?.toLocaleString() ?? "")}
                        readOnly
                        className="bg-muted font-mono"
                        placeholder="—"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label>Reference</Label>
                    <Input
                        value={parsed.reference ?? initialData?.reference ?? ""}
                        readOnly
                        className="bg-muted font-mono text-xs"
                        placeholder="—"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label>Date</Label>
                    <Input
                        value={
                            parsed.transactionDate
                                ? parsed.transactionDate.toLocaleDateString("en-KE")
                                : initialData?.transactionDate
                                    ? new Date(initialData.transactionDate).toLocaleDateString("en-KE")
                                    : ""
                        }
                        readOnly
                        className="bg-muted"
                        placeholder="—"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label>Category <span className="text-destructive">*</span></Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Member (optional) */}
            <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    Member
                    <span className="text-xs text-muted-foreground font-normal">(optional — attribute to a specific member)</span>
                </Label>
                <div className="relative" ref={dropdownRef}>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder="Search by name or phone…"
                            value={memberQuery}
                            onChange={(e) => {
                                setMemberQuery(e.target.value);
                                if (selectedMember) setSelectedMember(null);
                            }}
                            onFocus={() => { if (memberResults.length > 0) setShowDropdown(true); }}
                            className={cn("pl-9", selectedMember && "pr-9 bg-primary/5 border-primary/30 text-primary")}
                        />
                        {memberSearching && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        )}
                        {selectedMember && !memberSearching && (
                            <button
                                type="button"
                                onClick={clearMember}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {showDropdown && (
                        <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-popover shadow-md overflow-hidden">
                            {memberResults.map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => selectMember(m)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 transition-colors text-left"
                                >
                                    <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                                        {m.fullName.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">{m.fullName}</p>
                                        <p className="text-xs text-muted-foreground">{m.phoneNumber}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <Button
                type="submit"
                className="w-full"
                disabled={loading || !hasRef || !categoryId}
            >
                {loading
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{initialData ? "Updating…" : "Saving…"}</>
                    : initialData ? "Update Transaction" : "Save Transaction"
                }
            </Button>
        </form>
    );
}
