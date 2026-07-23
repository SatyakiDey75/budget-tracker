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
import { CreateInvestmentSchema, CreateInvestmentSchemaType } from "@/schema/transaction";
import React, { useCallback, useState } from "react";
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
import { CreateInvestment } from "../_actions/investment";

interface Props {
    trigger: React.ReactNode;
}

export default function CreateInvestmentDialog({ trigger }: Props) {
    const [open, setOpen] = useState(false);

    const form = useForm<CreateInvestmentSchemaType>({
        resolver: zodResolver(CreateInvestmentSchema),
        defaultValues: {
            type: "investment",
            amount: 0,
            description: "",
            date: new Date(),
            bankId: undefined,
            investmentApp: "",
        },
    });

    const handleBankChange = useCallback(
        (value: string | undefined) => form.setValue("bankId", value),
        [form]
    );

    const router = useRouter();
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: CreateInvestment,
        onError: () => {
            toast.error("Something went wrong", { id: "create-investment" });
        },
        onSuccess: () => {
            toast.success("Investment created successfully 🎉", { id: "create-investment" });
            form.reset({
                type: "investment",
                amount: 0,
                description: "",
                date: new Date(),
                bankId: undefined,
                investmentApp: "",
            });
            queryClient.invalidateQueries({ queryKey: ["overview"] });
            queryClient.invalidateQueries({ queryKey: ["bank-history"] });
            router.refresh();
            setOpen(false);
        },
    });

    const onSubmit = useCallback(
        (values: CreateInvestmentSchemaType) => {
            toast.loading("Creating investment...", { id: "create-investment" });
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
                        Create a new{" "}
                        <span className="m-1 text-blue-500">investment</span>{" "}
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
                                        <Input placeholder="e.g. Monthly SIP" {...field} />
                                    </FormControl>
                                    <FormDescription>Investment description (optional)</FormDescription>
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
                                                        {field.value ? (
                                                            format(field.value, "PPP")
                                                        ) : (
                                                            <span>Pick a date</span>
                                                        )}
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
                                            <Input
                                                placeholder="e.g. Zerodha, Groww"
                                                {...field}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

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
                                            ttype="investment"
                                            onChange={handleBankChange}
                                            className="w-full"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Bank account to deduct the investment from
                                    </FormDescription>
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
                        className="md:mb-0 mb-3 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {isPending ? <Loader2 className="animate-spin" /> : "Create"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
