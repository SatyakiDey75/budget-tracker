"use client";

import React from "react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteTransaction } from "../_actions/deleteTransaction";
import { useRouter } from "next/navigation";


interface Props {
    open: boolean;
    setOpen: (open: boolean) => void;
    transactionId: string;
}

export default function DeleteTransactionDialog({ open, setOpen, transactionId }: Props) {
    const router = useRouter();
    const queryClient = useQueryClient();

    const deleteMutation = useMutation({
        mutationFn: DeleteTransaction,
        onSuccess: async () => {
            toast.success(`Transaction deleted successfully 🎉`, {
                id: transactionId,
            });
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            queryClient.invalidateQueries({ queryKey: ["overview"] });
            queryClient.invalidateQueries({ queryKey: ["bank-history"] });
            router.refresh();
        },
        onError: () => {
            toast.error("Something went wrong", {
                id: transactionId,
            });
        },
    });

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your transaction.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() =>{
                        toast.loading("Deleting transaction...", {
                            id: transactionId,
                        });
                        deleteMutation.mutate(transactionId);
                    }}>Continue</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}