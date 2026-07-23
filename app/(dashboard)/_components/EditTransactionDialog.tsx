"use client";

import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { UpdateTransactionSchema, UpdateTransactionSchemaType } from "@/schema/transaction";
import React, { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import CategoryPicker from "./CategoryPicker";
import BankPicker from "./BankPicker";
import { Popover, PopoverTrigger } from "@radix-ui/react-popover";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { PopoverContent } from "@/components/ui/popover";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DateToUTCDate } from "@/lib/helpers";
import { useRouter } from "next/navigation";
import { UpdateTransaction } from "../transactions/_actions/updateTransaction";
import { GetTransactionHistoryResponseType } from "@/app/api/transactions-history/route";

type TransactionRow = GetTransactionHistoryResponseType[0];

interface Props {
    open: boolean;
    setOpen: (open: boolean) => void;
    transaction: TransactionRow;
}

export default function EditTransactionDialog({ open, setOpen, transaction }: Props) {
    const type = transaction.type as "income" | "expense" | "investment";
    const isInvestment = type === "investment";

    const form = useForm<UpdateTransactionSchemaType>({
        resolver: zodResolver(UpdateTransactionSchema),
        defaultValues: {
            transactionId: transaction.id,
            type,
            amount: transaction.amount,
            description: transaction.description || "",
            date: new Date(transaction.date),
            category: isInvestment ? undefined : transaction.category,
            bankId: transaction.bankId ?? undefined,
            merchantName: !isInvestment ? ((transaction as any).merchantName ?? undefined) : undefined,
            investmentApp: isInvestment ? ((transaction as any).investmentApp ?? transaction.category) : undefined,
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                transactionId: transaction.id,
                type,
                amount: transaction.amount,
                description: transaction.description || "",
                date: new Date(transaction.date),
                category: isInvestment ? undefined : transaction.category,
                bankId: transaction.bankId ?? undefined,
                merchantName: !isInvestment ? ((transaction as any).merchantName ?? undefined) : undefined,
                investmentApp: isInvestment ? ((transaction as any).investmentApp ?? transaction.category) : undefined,
            });
        }
    }, [open, transaction.id]);

    const handleCategoryChange = useCallback(
        (value: string) => form.setValue("category", value, { shouldDirty: true }),
        [form]
    );

    const handleBankChange = useCallback(
        (value: string | undefined) => form.setValue("bankId", value, { shouldDirty: true }),
        [form]
    );

    const router = useRouter();
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: UpdateTransaction,
        onError: () => {
            toast.error("Something went wrong", { id: "update-transaction" });
        },
        onSuccess: () => {
            toast.success("Transaction updated successfully 🎉", { id: "update-transaction" });
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            queryClient.invalidateQueries({ queryKey: ["overview"] });
            queryClient.invalidateQueries({ queryKey: ["bank-history"] });
            router.refresh();
            setOpen(false);
        },
    });

    const onSubmit = useCallback(
        (values: UpdateTransactionSchemaType) => {
            toast.loading("Updating transaction...", { id: "update-transaction" });
            mutate({ ...values, date: DateToUTCDate(values.date) });
        },
        [mutate]
    );

    const isDirty = form.formState.isDirty;

    const typeColor = type === "income"
        ? "text-emerald-500"
        : type === "investment"
        ? "text-blue-500"
        : "text-rose-500";

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        Edit{" "}
                        <span className={cn("m-1", typeColor)}>{type}</span>{" "}
                        transaction
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormDescription>Transaction description</FormDescription>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Amount *</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormDescription>Transaction amount</FormDescription>
                                </FormItem>
                            )}
                        />

                        {isInvestment ? (
                            // Investment: Date + App in the same row
                            <div className="flex items-center gap-2">
                                <FormField
                                    control={form.control}
                                    name="date"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col flex-1">
                                            <FormLabel>Transaction date</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant="outline"
                                                            className={cn(
                                                                "w-full pl-3 text-left font-normal",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={(value) => { if (!value) return; field.onChange(value); }}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="investmentApp"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col flex-1">
                                            <FormLabel>
                                                App{" "}
                                                <span className="text-muted-foreground font-normal">(optional)</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Zerodha, Groww" {...field} value={field.value ?? ""} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        ) : (
                            // Income/Expense: Category + Date in the same row
                            <div className="flex items-center justify-between gap-2">
                                <FormField
                                    control={form.control}
                                    name="category"
                                    render={({}) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Category</FormLabel>
                                            <FormControl>
                                                <CategoryPicker
                                                    type={type as "income" | "expense"}
                                                    value={transaction.category}
                                                    onChange={handleCategoryChange}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Select a category for this transaction
                                            </FormDescription>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="date"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Transaction date</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant="outline"
                                                            className={cn(
                                                                "w-[200px] pl-3 text-left font-normal",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={(value) => { if (!value) return; field.onChange(value); }}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormDescription>
                                                Select a date for this transaction
                                            </FormDescription>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        <FormField
                            control={form.control}
                            name="bankId"
                            render={({}) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>
                                        Source{" "}
                                        <span className="text-muted-foreground font-normal">(optional)</span>
                                    </FormLabel>
                                    <FormControl>
                                        <BankPicker
                                            ttype={type}
                                            value={transaction.bankId ?? undefined}
                                            onChange={handleBankChange}
                                            className="w-full"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Select the source of transaction
                                    </FormDescription>
                                </FormItem>
                            )}
                        />

                        {type === "expense" && (
                            <FormField
                                control={form.control}
                                name="merchantName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Merchant{" "}
                                            <span className="text-muted-foreground font-normal">(optional)</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g. Amazon, Swiggy, Zomato"
                                                {...field}
                                                value={field.value ?? ""}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Where was this expense made?
                                        </FormDescription>
                                    </FormItem>
                                )}
                            />
                        )}
                    </form>
                </Form>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        onClick={form.handleSubmit(onSubmit)}
                        disabled={!isDirty || isPending}
                        className="md:mb-0 mb-3"
                    >
                        {isPending ? <Loader2 className="animate-spin" /> : "Save"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
