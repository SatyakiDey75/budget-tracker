"use client";

import React, { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Trash2 } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateCard, DeleteBank } from "../_actions/banks";
import { toast } from "sonner";
import { UpdateCardSchema, UpdateCardSchemaType } from "@/schema/banks";

interface CardRecord {
    id: string;
    bankName: string;
    accountName: string;
    balance: number;
    limit: number;
}

interface Props {
    card: CardRecord;
    open: boolean;
    setOpen: (open: boolean) => void;
}

export default function CardDetailsDialog({ card, open, setOpen }: Props) {
    const queryClient = useQueryClient();

    const form = useForm<UpdateCardSchemaType>({
        resolver: zodResolver(UpdateCardSchema),
        defaultValues: {
            id: card.id,
            accountName: card.accountName,
            balance: card.balance,
            limit: card.limit,
        },
    });

    useEffect(() => {
        form.reset({
            id: card.id,
            accountName: card.accountName,
            balance: card.balance,
            limit: card.limit,
        });
    }, [card, form]);

    const { mutate: deleteCard, isPending: isDeleting } = useMutation({
        mutationFn: DeleteBank,
        onSuccess: async () => {
            toast.success("Card removed", { id: "delete-card" });
            await queryClient.invalidateQueries({ queryKey: ["banks"] });
            setOpen(false);
        },
        onError: () => {
            toast.error("Something went wrong", { id: "delete-card" });
        },
    });

    const { mutate, isPending } = useMutation({
        mutationFn: UpdateCard,
        onSuccess: async () => {
            toast.success("Card updated successfully 🎉", { id: "update-card" });
            await queryClient.invalidateQueries({ queryKey: ["banks"] });
            setOpen(false);
        },
        onError: () => {
            toast.error("Something went wrong", { id: "update-card" });
        },
    });

    const onSubmit = useCallback(
        (values: UpdateCardSchemaType) => {
            toast.loading("Saving changes...", { id: "update-card" });
            mutate(values);
        },
        [mutate]
    );

    const watchedBalance = form.watch("balance");
    const watchedLimit = form.watch("limit");
    const used = Math.max(0, watchedLimit - watchedBalance);
    const usedPercent = watchedLimit > 0 ? Math.min(100, (used / watchedLimit) * 100) : 0;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <CreditCard className="h-10 w-10 p-2 rounded-lg bg-violet-400/10 text-violet-500" />
                        <div>
                            <DialogTitle>{card.bankName}</DialogTitle>
                            <p className="text-sm text-muted-foreground mt-0.5">Credit card details</p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Used: ₹{used.toLocaleString()}</span>
                        <span>Limit: ₹{watchedLimit.toLocaleString()}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                            className="h-full rounded-full bg-violet-500 transition-all"
                            style={{ width: `${usedPercent}%` }}
                        />
                    </div>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="accountName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Card Label</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormDescription>A label to identify this card</FormDescription>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="balance"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Available Credit</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormDescription>Remaining available credit on this card</FormDescription>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="limit"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Credit Limit</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormDescription>Total credit limit on this card</FormDescription>
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
                                <AlertDialogTitle>Remove {card.bankName} – {card.accountName}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will remove the credit card. Existing transactions linked to it will remain but the card will no longer appear in pickers or the balance chart.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => deleteCard(card.id)}
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
