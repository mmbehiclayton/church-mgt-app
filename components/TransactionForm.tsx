"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { parseMpesaMessage, ParsedTransaction } from "@/lib/parser";
import { saveTransaction } from "@/app/actions";

interface Category {
    id: string;
    name: string;
}

export default function TransactionForm({ categories, onSuccess }: { categories: Category[], onSuccess?: () => void }) {
    const router = useRouter();
    const [message, setMessage] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [loading, setLoading] = useState(false);

    // Auto-parse when message changes. Using a derived value instead of effect + state
    // helps avoid "set state in effect" warning and extra renders.
    const parsed: Partial<ParsedTransaction> = useMemo(() => {
        if (message.trim().length > 10) {
            return parseMpesaMessage(message) || {};
        }
        return {};
    }, [message]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoryId || !parsed.reference) {
            alert("Please select a category and ensure message is valid.");
            return;
        }

        setLoading(true);
        // We know these are present because of the check above
        const payload = {
            categoryId,
            amount: parsed.amount!,
            reference: parsed.reference!,
            transactionDate: parsed.transactionDate!,
            transactionTime: parsed.transactionTime,
            bank: parsed.paymentMethod || "KCB", // Ensure it defaults if parser misses
            paybill: parsed.paymentMethod?.includes("Pay Bill") ? parsed.paymentMethod : null,
            account: parsed.account,
            accountName: parsed.accountName,
            rawMessage: message
        };

        const res = await saveTransaction(payload);
        setLoading(false);

        if (res.success) {
            alert("Transaction saved!");
            setMessage("");
            // parsed derived state clears automatically when message clears
            setCategoryId("");
            router.refresh();
            onSuccess?.();
        } else {
            alert(res.error);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>New Transaction</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>M-Pesa Message</Label>
                        <Textarea
                            placeholder="Paste M-Pesa message here..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="h-32"
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
                            <Input value={parsed.amount || ""} readOnly className="bg-gray-100" />
                        </div>
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Input
                                value={parsed.transactionDate ? parsed.transactionDate.toLocaleDateString() : ""}
                                readOnly
                                className="bg-gray-100"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Ref</Label>
                            <Input value={parsed.reference || ""} readOnly className="bg-gray-100" />
                        </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading || !parsed.reference}>
                        {loading ? "Saving..." : "Save Transaction"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
