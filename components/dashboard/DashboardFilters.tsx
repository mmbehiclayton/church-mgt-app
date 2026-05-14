"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@/components/ui/command";
import { useState, useEffect, useRef } from "react";
import { DateRange } from "react-day-picker";

interface Category {
    id: string;
    name: string;
}

export default function DashboardFilters({ categories }: { categories: Category[] }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // -- Date Range State --
    const [date, setDate] = useState<DateRange | undefined>({
        from: searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined,
        to: searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined,
    });

    // -- Category State --
    const [openCategory, setOpenCategory] = useState(false);
    const initialCats = searchParams.get("categories")?.split(",") || [];
    const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCats);

    // -- Reference search state (debounced) --
    const [refInput, setRefInput] = useState(searchParams.get("ref") || "");
    const refTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Apply Filters Effect (date + categories)
    useEffect(() => {
        const params = new URLSearchParams(searchParams);

        if (date?.from) params.set("from", format(date.from, "yyyy-MM-dd"));
        else params.delete("from");

        if (date?.to) params.set("to", format(date.to, "yyyy-MM-dd"));
        else params.delete("to");

        if (selectedCategories.length > 0) params.set("categories", selectedCategories.join(","));
        else params.delete("categories");

        if (params.toString() !== searchParams.toString()) {
            router.push(`${pathname}?${params.toString()}`);
        }
    }, [date, selectedCategories, pathname, router, searchParams]);

    // Debounced reference search
    useEffect(() => {
        if (refTimer.current) clearTimeout(refTimer.current);
        refTimer.current = setTimeout(() => {
            const params = new URLSearchParams(searchParams);
            if (refInput.trim()) params.set("ref", refInput.trim());
            else params.delete("ref");
            if (params.toString() !== searchParams.toString()) {
                router.push(`${pathname}?${params.toString()}`);
            }
        }, 350);
        return () => { if (refTimer.current) clearTimeout(refTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refInput]);

    const toggleCategory = (id: string) => {
        if (selectedCategories.includes(id)) {
            setSelectedCategories(prev => prev.filter(c => c !== id));
        } else {
            setSelectedCategories(prev => [...prev, id]);
        }
    };

    const hasFilters = !!(date?.from || date?.to || selectedCategories.length > 0 || refInput.trim());

    function resetAll() {
        setDate(undefined);
        setSelectedCategories([]);
        setRefInput("");
    }

    return (
        <div className="bg-card p-3 rounded-lg border border-border shadow-sm flex flex-wrap items-center gap-2">
            {/* Reference search */}
            <div className="relative w-full sm:w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                    placeholder="Transaction code…"
                    value={refInput}
                    onChange={e => setRefInput(e.target.value)}
                    className="pl-8 h-9 text-sm font-mono"
                />
                {refInput && (
                    <button
                        onClick={() => setRefInput("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>

            <div className="flex flex-wrap gap-2 items-center">
                {/* Start Date */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                                "w-full sm:w-[150px] justify-start text-left font-normal",
                                !date?.from && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? format(date.from, "PPP") : <span>Start Date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={date?.from}
                            onSelect={(d) => setDate(prev => ({ ...prev, from: d, to: prev?.to }))}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>

                {/* End Date */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                                "w-full sm:w-[150px] justify-start text-left font-normal",
                                !date?.to && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.to ? format(date.to, "PPP") : <span>End Date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={date?.to}
                            onSelect={(d) => setDate(prev => ({ ...prev, from: prev?.from, to: d }))}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>

            {/* Category Filter */}
            <Popover open={openCategory} onOpenChange={setOpenCategory}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openCategory}
                        className="w-full sm:w-[200px] justify-between"
                    >
                        {selectedCategories.length > 0
                            ? `${selectedCategories.length} selected`
                            : "Select Categories"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                    <Command>
                        <CommandInput placeholder="Search category..." />
                        <CommandList>
                            <CommandEmpty>No category found.</CommandEmpty>
                            <CommandGroup>
                                {categories.map((category) => (
                                    <CommandItem
                                        key={category.id}
                                        value={category.name}
                                        onSelect={() => toggleCategory(category.id)}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                selectedCategories.includes(category.id) ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {category.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {hasFilters && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetAll}
                    className="text-muted-foreground hover:text-foreground h-9 px-2.5"
                >
                    <X className="h-3.5 w-3.5 mr-1" /> Clear
                </Button>
            )}
        </div>
    );
}
