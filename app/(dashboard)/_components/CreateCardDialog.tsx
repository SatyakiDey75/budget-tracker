"use client";

import React, { ReactNode, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateCard } from "../_actions/banks";
import { toast } from "sonner";
import { CreateCardSchema, CreateCardSchemaType } from "@/schema/banks";
import { SUPPORTED_BANKS, getBankLogo } from "@/lib/banks";

interface Props {
    trigger?: ReactNode;
    successCallback?: () => void;
}

export default function CreateCardDialog({ trigger, successCallback }: Props) {
    const [open, setOpen] = React.useState(false);
    const form = useForm<CreateCardSchemaType>({
        resolver: zodResolver(CreateCardSchema),
        defaultValues: { limit: 0 },
    });

    const queryClient = useQueryClient();
    const selectedBank = form.watch("bankName");

    const { mutate, isPending } = useMutation({
        mutationFn: CreateCard,
        onSuccess: async () => {
            form.reset({ limit: 0 });
            toast.success("Credit card added successfully 🎉", { id: "create-card" });
            successCallback?.();
            await queryClient.invalidateQueries({ queryKey: ["banks"] });
            setOpen(false);
        },
        onError: () => {
            toast.error("Something went wrong", { id: "create-card" });
        },
    });

    const onSubmit = useCallback(
        (values: CreateCardSchemaType) => {
            toast.loading("Adding card...", { id: "create-card" });
            mutate(values);
        },
        [mutate]
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ?? (
                    <Button variant={"ghost"} className="flex items-center border-separate justify-start rounded-none border-b px-3 py-3 text-muted-foreground">
                        Add Card
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add a credit card</DialogTitle>
                    <DialogDescription>Track your credit card balance and available limit</DialogDescription>
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
                                                            <img src={bank.logo} alt={bank.label} className="h-5 w-5 object-contain rounded" />
                                                            {bank.label}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormControl>
                                    <FormDescription>Select the card&apos;s issuing bank</FormDescription>
                                </FormItem>
                            )}
                        />

                        {selectedBank && (
                            <div className="flex items-center gap-3 rounded-md border p-3 bg-muted/40">
                                <img src={getBankLogo(selectedBank)} alt={selectedBank} className="h-10 w-10 object-contain rounded-md" />
                                <span className="font-medium text-sm">{selectedBank}</span>
                            </div>
                        )}

                        <FormField
                            control={form.control}
                            name="accountName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Card Label</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. HDFC Millenia" {...field} />
                                    </FormControl>
                                    <FormDescription>A label to identify this card</FormDescription>
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

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant={"secondary"} type="button" onClick={() => form.reset({ limit: 0 })}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button onClick={form.handleSubmit(onSubmit)} disabled={isPending} className="md:mb-0 mb-3">
                        {!isPending && "Add Card"}
                        {isPending && <Loader2 className="animate-spin" />}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
