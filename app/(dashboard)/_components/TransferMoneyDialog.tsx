"use client";

import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CreateTransferSchema, CreateTransferSchemaType } from "@/schema/banks";
import React, { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import BankPicker from "./BankPicker";
import { Popover, PopoverTrigger } from "@radix-ui/react-popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Loader2 } from "lucide-react";
import { PopoverContent } from "@/components/ui/popover";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { DateToUTCDate } from "@/lib/helpers";
import { useRouter } from "next/navigation";
import { CreateTransfer } from "../_actions/transferMoney";

interface Props {
    trigger: React.ReactNode;
}

export default function TransferMoneyDialog({ trigger }: Props) {
    const [open, setOpen] = useState(false);

    const form = useForm<CreateTransferSchemaType>({
        resolver: zodResolver(CreateTransferSchema),
        defaultValues: {
            sourceBankId: undefined,
            destBankId: undefined,
            amount: 0,
            date: new Date(),
        },
    });

    const handleSourceChange = useCallback(
        (value: string | undefined) => form.setValue("sourceBankId", value ?? ""),
        [form]
    );

    const handleDestChange = useCallback(
        (value: string | undefined) => form.setValue("destBankId", value ?? ""),
        [form]
    );

    const router = useRouter();
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: CreateTransfer,
        onError: () => {
            toast.error("Something went wrong", { id: "transfer-money" });
        },
        onSuccess: () => {
            toast.success("Transfer recorded successfully 🎉", { id: "transfer-money" });
            form.reset({
                sourceBankId: undefined,
                destBankId: undefined,
                amount: 0,
                date: new Date(),
            });
            queryClient.invalidateQueries({ queryKey: ["overview"] });
            queryClient.invalidateQueries({ queryKey: ["banks"] });
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            queryClient.invalidateQueries({ queryKey: ["bank-history"] });
            router.refresh();
            setOpen(false);
        },
    });

    const onSubmit = useCallback(
        (values: CreateTransferSchemaType) => {
            toast.loading("Recording transfer...", { id: "transfer-money" });
            mutate({ ...values, date: DateToUTCDate(values.date) });
        },
        [mutate]
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        Transfer <span className="m-1 text-gray-400">money</span> between accounts
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                        <div className="flex items-center gap-2">
                            <FormField
                                control={form.control}
                                name="sourceBankId"
                                render={({}) => (
                                    <FormItem className="flex flex-col flex-1">
                                        <FormLabel>From</FormLabel>
                                        <FormControl>
                                            <BankPicker
                                                regularOnly
                                                onChange={handleSourceChange}
                                                className="w-full"
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="destBankId"
                                render={({}) => (
                                    <FormItem className="flex flex-col flex-1">
                                        <FormLabel>To</FormLabel>
                                        <FormControl>
                                            <BankPicker
                                                regularOnly
                                                onChange={handleDestChange}
                                                className="w-full"
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Amount *</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Date</FormLabel>
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
                                                onSelect={(value) => {
                                                    if (!value) return;
                                                    field.onChange(value);
                                                }}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </FormItem>
                            )}
                        />
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
                        disabled={isPending}
                    >
                        {isPending ? <Loader2 className="animate-spin" /> : "Transfer"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
