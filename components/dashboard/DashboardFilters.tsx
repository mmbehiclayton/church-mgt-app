"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import { useState, useEffect } from "react";
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
    // Parse "cat=id1,id2"
    const initialCats = searchParams.get("categories")?.split(",") || [];
    const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCats);

    // Apply Filters Effect
    useEffect(() => {
        const params = new URLSearchParams(searchParams);

        // Date
        if (date?.from) params.set("from", format(date.from, "yyyy-MM-dd"));
        else params.delete("from");

        if (date?.to) params.set("to", format(date.to, "yyyy-MM-dd"));
        else params.delete("to");

        // Categories
        if (selectedCategories.length > 0) {
            params.set("categories", selectedCategories.join(","));
        } else {
            params.delete("categories");
        }

        if (params.toString() !== searchParams.toString()) {
            router.push(`${pathname}?${params.toString()}`);
        }
    }, [date, selectedCategories, pathname, router, searchParams]);

    const toggleCategory = (id: string) => {
        if (selectedCategories.includes(id)) {
            setSelectedCategories(prev => prev.filter(c => c !== id));
        } else {
            setSelectedCategories(prev => [...prev, id]);
        }
    };

    return (
        <div className="bg-card p-3 rounded-lg border border-border shadow-sm space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
            <div className="flex items-center gap-2 justify-between sm:justify-start">
                <span className="text-sm font-medium text-foreground">Filters:</span>
                {(date?.from || selectedCategories.length > 0) && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setDate(undefined);
                            setSelectedCategories([]);
                        }}
                        className="text-red-500 hover:text-red-600 h-8 sm:hidden"
                    >
                        Reset
                    </Button>
                )}
            </div>

            <div className="flex flex-col gap-2 w-full sm:flex-row sm:w-auto sm:items-center">
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

            {(date?.from || selectedCategories.length > 0) && (
                <Button
                    variant="ghost"
                    onClick={() => {
                        setDate(undefined);
                        setSelectedCategories([]);
                    }}
                    className="text-red-500 hover:text-red-600 hidden sm:inline-flex"
                >
                    Reset
                </Button>
            )}
        </div>
    );
}
