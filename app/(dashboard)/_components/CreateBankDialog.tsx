"use client";

import React, { ReactNode, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, PlusSquare } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateBank } from "../_actions/banks";
import { toast } from "sonner";
import { CreateBankSchema, CreateBankSchemaType } from "@/schema/banks";
import { SUPPORTED_BANKS, getBankLogo } from "@/lib/banks";

interface Props {
    trigger?: ReactNode;
    successCallback?: () => void;
}

export default function CreateBankDialog({ trigger, successCallback }: Props) {
    const [open, setOpen] = React.useState(false);
    const form = useForm<CreateBankSchemaType>({
        resolver: zodResolver(CreateBankSchema),
        defaultValues: {
            balance: 0,
        },
    });

    const queryClient = useQueryClient();
    const selectedBank = form.watch("bankName");

    const { mutate, isPending } = useMutation({
        mutationFn: CreateBank,
        onSuccess: async () => {
            form.reset({ balance: 0 });
            toast.success("Bank added successfully 🎉", { id: "create-bank" });
            successCallback?.();
            await queryClient.invalidateQueries({ queryKey: ["banks"] });
            setOpen(false);
        },
        onError: () => {
            toast.error("Something went wrong", { id: "create-bank" });
        },
    });

    const onSubmit = useCallback(
        (values: CreateBankSchemaType) => {
            toast.loading("Adding bank...", { id: "create-bank" });
            mutate(values);
        },
        [mutate]
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? (
                    trigger
                ) : (
                    <Button variant={"ghost"} className="flex items-center border-separate justify-start rounded-none border-b px-3 py-3 text-muted-foreground">
                        <PlusSquare className="mr-2 h-4 w-4" />
                        Add Bank
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add a bank account</DialogTitle>
                    <DialogDescription>Link a bank account to track balances automatically</DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="bankName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bank</FormLabel>
                                    <FormControl>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a bank" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {SUPPORTED_BANKS.map((bank) => (
                                                    <SelectItem key={bank.value} value={bank.value}>
                                                        <div className="flex items-center gap-2">
                                                            <img
                                                                src={bank.logo}
                                                                alt={bank.label}
                                                                className="h-5 w-5 object-contain rounded"
                                                            />
                                                            {bank.label}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormControl>
                                    <FormDescription>Select your bank</FormDescription>
                                </FormItem>
                            )}
                        />

                        {selectedBank && (
                            <div className="flex items-center gap-3 rounded-md border p-3 bg-muted/40">
                                <img
                                    src={getBankLogo(selectedBank)}
                                    alt={selectedBank}
                                    className="h-10 w-10 object-contain rounded-md"
                                />
                                <span className="font-medium text-sm">{selectedBank}</span>
                            </div>
                        )}

                        <FormField
                            control={form.control}
                            name="branch"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Branch</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Bidhan Sarani" {...field} />
                                    </FormControl>
                                    <FormDescription>Branch name or location</FormDescription>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="accountName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Account Label</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Savings Account" {...field} />
                                    </FormControl>
                                    <FormDescription>A label for this account</FormDescription>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="balance"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Current Balance</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormDescription>Current account balance</FormDescription>
                                </FormItem>
                            )}
                        />
                    </form>
                </Form>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant={"secondary"} type="button" onClick={() => form.reset({ balance: 0 })}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button onClick={form.handleSubmit(onSubmit)} disabled={isPending} className="md:mb-0 mb-3">
                        {!isPending && "Add Bank"}
                        {isPending && <Loader2 className="animate-spin" />}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
