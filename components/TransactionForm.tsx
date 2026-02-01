"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { parseMpesaMessage, ParsedTransaction } from "@/lib/parser";
import { saveTransaction, updateTransaction } from "@/app/actions";

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
}

export default function TransactionForm({
    categories,
    onSuccess,
    initialData
}: {
    categories: Category[],
    onSuccess?: () => void,
    initialData?: TransactionData
}) {
    const router = useRouter();
    const [message, setMessage] = useState(initialData?.rawMessage || "");
    const [categoryId, setCategoryId] = useState(initialData?.categoryId || "");
    const [loading, setLoading] = useState(false);

    // Auto-parse when message changes. 
    const parsed: Partial<ParsedTransaction> = useMemo(() => {
        if (message.trim().length > 10) {
            return parseMpesaMessage(message) || {};
        }
        return {};
    }, [message]);

    // If initialData is provided, we might want to ensure fields are consistent
    // But relying on rawMessage parsing is the core behavior here.

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Use parsed data OR initial data fallback if message hasn't changed? 
        // Actually, if user edits raw message, we want new parsed data.
        // If user is just changing category, parsed data should still be valid.

        const effectiveRef = parsed.reference || initialData?.reference;

        if (!categoryId || !effectiveRef) {
            alert("Please select a category and ensure message is valid.");
            return;
        }

        setLoading(true);

        const payload = {
            categoryId,
            amount: parsed.amount ?? initialData?.amount ?? 0,
            reference: parsed.reference ?? initialData?.reference ?? "",
            transactionDate: parsed.transactionDate ?? initialData?.transactionDate ?? new Date(),
            transactionTime: parsed.transactionTime ?? initialData?.transactionTime,
            bank: (parsed.paymentMethod || initialData?.bank) || "KCB",
            paybill: parsed.paymentMethod?.includes("Pay Bill") ? parsed.paymentMethod : (initialData?.paybill || null),
            account: parsed.account ?? initialData?.account,
            accountName: parsed.accountName ?? initialData?.accountName,
            rawMessage: message
        };

        let res;
        if (initialData?.id) {
            res = await updateTransaction(initialData.id, payload);
        } else {
            res = await saveTransaction(payload);
        }

        setLoading(false);

        if (res.success) {
            alert(initialData ? "Transaction updated!" : "Transaction saved!");
            if (!initialData) {
                setMessage("");
                setCategoryId("");
            }
            router.refresh();
            onSuccess?.();
        } else {
            alert(res.error);
        }
    };

    return (
        <Card className="border-0 shadow-none">
            {!initialData && (
                <CardHeader className="px-0 pt-0">
                    <CardTitle>New Transaction</CardTitle>
                </CardHeader>
            )}
            <CardContent className="px-0">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>M-Pesa Message</Label>
                        <Textarea
                            placeholder="Paste M-Pesa message here..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="h-32 font-mono text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={categoryId} onValueChange={setCategoryId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Amount</Label>
                            <Input value={parsed.amount ?? initialData?.amount ?? ""} readOnly className="bg-muted" />
                        </div>
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Input
                                value={
                                    parsed.transactionDate
                                        ? parsed.transactionDate.toLocaleDateString()
                                        : (initialData?.transactionDate ? new Date(initialData.transactionDate).toLocaleDateString() : "")
                                }
                                readOnly
                                className="bg-muted"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Ref</Label>
                            <Input value={parsed.reference ?? initialData?.reference ?? ""} readOnly className="bg-muted" />
                        </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading || (!parsed.reference && !initialData?.reference)}>
                        {loading ? "Saving..." : (initialData ? "Update Transaction" : "Save Transaction")}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
