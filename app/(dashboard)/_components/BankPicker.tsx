"use client";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import React, { useCallback, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBankLogo } from "@/lib/banks";
import { TransactionType } from "@/lib/types";

interface BankRecord {
    id: string;
    bankName: string;
    branch: string;
    accountName: string;
    balance: number;
}

interface Props {
    onChange: (value: string | undefined) => void;
    className?: string;
    ttype?: TransactionType;
    value?: string;
}

export default function BankPicker({ onChange, className, ttype, value: initialValue }: Props) {
    const [open, setOpen] = React.useState(false);
    const [value, setValue] = React.useState<string>(initialValue || "");

    useEffect(() => {
        if (initialValue !== undefined) setValue(initialValue);
    }, [initialValue]);

    useEffect(() => {
        onChange(value || undefined);
    }, [value, onChange]);

    const banksQuery = useQuery<BankRecord[]>({
        queryKey: ["banks"],
        queryFn: () => fetch("/api/banks").then((res) => res.json()),
    });

    const selectedBank = banksQuery.data?.find((b) => b.id === value);

    const handleSelect = useCallback(
        (bankId: string) => {
            setValue((prev) => (prev === bankId ? "" : bankId));
            setOpen(false);
        },
        []
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-[200px] justify-between", className)}
                >
                    {selectedBank ? (
                        <BankRow bank={selectedBank} />
                    ) : (
                        <span className="text-muted-foreground text-sm">Select bank</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className={cn("w-[220px] p-0", className)} align="start">
                <Command>
                    <CommandInput placeholder="Search bank..." />
                    <CommandEmpty>
                        <p>No banks found</p>
                        <p className="text-xs text-muted-foreground">Add a bank in Manage</p>
                    </CommandEmpty>
                    <CommandGroup>
                        <CommandList>
                            {banksQuery.data?.map((bank) => (ttype === 'expense' || !bank.bankName.toLowerCase().includes('credit card')) && (
                                <CommandItem key={bank.id} onSelect={() => handleSelect(bank.id)}>
                                    <BankRow bank={bank} />
                                    <Check
                                        className={cn(
                                            "ml-auto h-4 w-4 opacity-0",
                                            value === bank.id && "opacity-100"
                                        )}
                                    />
                                </CommandItem>
                            ))}
                        </CommandList>
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

function BankRow({ bank }: { bank: BankRecord }) {
    return (
        <div className="flex items-center gap-2 min-w-0">
            <img
                src={getBankLogo(bank.bankName)}
                alt={bank.bankName}
                className="h-4 w-4 object-contain rounded shrink-0"
            />
            <span className="truncate text-sm">{bank.bankName} – {bank.accountName}</span>
        </div>
    );
}
