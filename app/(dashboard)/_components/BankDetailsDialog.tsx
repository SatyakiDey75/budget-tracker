"use client";

import React, { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateBank, DeleteBank } from "../_actions/banks";
import { toast } from "sonner";
import { UpdateBankSchema, UpdateBankSchemaType } from "@/schema/banks";
import { getBankLogo } from "@/lib/banks";

interface BankRecord {
    id: string;
    bankName: string;
    branch: string;
    accountName: string;
    balance: number;
}

interface Props {
    bank: BankRecord;
    open: boolean;
    setOpen: (open: boolean) => void;
}

export default function BankDetailsDialog({ bank, open, setOpen }: Props) {
    const queryClient = useQueryClient();

    const form = useForm<UpdateBankSchemaType>({
        resolver: zodResolver(UpdateBankSchema),
        defaultValues: {
            id: bank.id,
            branch: bank.branch,
            accountName: bank.accountName,
            balance: bank.balance,
        },
    });

    useEffect(() => {
        form.reset({
            id: bank.id,
            branch: bank.branch,
            accountName: bank.accountName,
            balance: bank.balance,
        });
    }, [bank, form]);

    const { mutate, isPending } = useMutation({
        mutationFn: UpdateBank,
        onSuccess: async () => {
            toast.success("Bank updated successfully 🎉", { id: "update-bank" });
            await queryClient.invalidateQueries({ queryKey: ["banks"] });
            setOpen(false);
        },
        onError: () => {
            toast.error("Something went wrong", { id: "update-bank" });
        },
    });

    const { mutate: deleteBank, isPending: isDeleting } = useMutation({
        mutationFn: DeleteBank,
        onSuccess: async () => {
            toast.success("Bank removed", { id: "delete-bank" });
            await queryClient.invalidateQueries({ queryKey: ["banks"] });
            setOpen(false);
        },
        onError: () => {
            toast.error("Something went wrong", { id: "delete-bank" });
        },
    });

    const onSubmit = useCallback(
        (values: UpdateBankSchemaType) => {
            toast.loading("Saving changes...", { id: "update-bank" });
            mutate(values);
        },
        [mutate]
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <img
                            src={getBankLogo(bank.bankName)}
                            alt={bank.bankName}
                            className="h-10 w-10 object-contain rounded-md"
                        />
                        <div>
                            <DialogTitle>{bank.bankName}</DialogTitle>
                            <p className="text-sm text-muted-foreground mt-0.5">Bank account details</p>
                        </div>
                    </div>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="branch"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Branch</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
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
                                    <FormLabel>Account Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
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
                                    <FormLabel>Balance</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormDescription>Current account balance</FormDescription>
                                </FormItem>
                            )}
                        />
                    </form>
                </Form>

                <DialogFooter className="flex-row items-center justify-between gap-2">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={isDeleting} className="gap-1.5">
                                <Trash2 className="h-3.5 w-3.5" />
                                Remove
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Remove {bank.bankName}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will remove the bank account. Existing transactions linked to it will remain but the account will no longer appear in pickers or the balance chart.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => deleteBank(bank.id)}
                                >
                                    Remove
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <div className="flex gap-2">
                        <DialogClose asChild>
                            <Button variant="secondary" type="button" onClick={() => form.reset()}>
                                Cancel
                            </Button>
                        </DialogClose>
                        {form.formState.isDirty && (
                            <Button onClick={form.handleSubmit(onSubmit)} disabled={isPending}>
                                {!isPending ? "Save" : <Loader2 className="animate-spin" />}
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
