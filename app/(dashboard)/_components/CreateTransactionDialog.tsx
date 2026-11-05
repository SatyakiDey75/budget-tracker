"use client";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CreateTransactionSchema, CreateTransactionSchemaType } from "@/schema/transaction";
import { CreateCCBillPaymentSchema, CreateCCBillPaymentSchemaType } from "@/schema/banks";
import React, { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CategoryPicker from "./CategoryPicker";
import BankPicker from "./BankPicker";
import { Popover, PopoverTrigger } from "@radix-ui/react-popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, CreditCard, Loader2 } from "lucide-react";
import { PopoverContent } from "@/components/ui/popover";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreateTransaction } from "../_actions/transaction";
import { CreateCCBillPayment } from "../_actions/ccBillPayment";
import { toast } from "sonner";
import { DateToUTCDate, formatIST } from "@/lib/helpers";
import { getBankLogo } from "@/lib/banks";
import { useRouter } from "next/navigation";

interface BankRecord {
    id: string;
    bankName: string;
    accountName: string;
    balance: number;
    isCredit: boolean;
    limit: number;
}

interface Props {
    trigger: React.ReactNode;
    type: "income" | "expense";
}


export default function CreateTransactionDialog({ trigger, type }: Props) {

    const [open, setOpen] = React.useState(false);
    const [isCCPayment, setIsCCPayment] = React.useState(false);
    const [ccDate, setCcDate] = React.useState<Date>(() => new Date());

    const form = useForm<CreateTransactionSchemaType>({
        resolver: zodResolver(CreateTransactionSchema),
        defaultValues: {
            type,
            date: new Date(),
        }
    });

    const ccForm = useForm<CreateCCBillPaymentSchemaType>({
        resolver: zodResolver(CreateCCBillPaymentSchema),
        defaultValues: { date: new Date() },
    });

    useEffect(() => {
        if (isCCPayment) setCcDate(new Date());
    }, [isCCPayment]);

    const banksQuery = useQuery<BankRecord[]>({
        queryKey: ["banks"],
        queryFn: () => fetch("/api/banks").then((res) => res.json()),
    });

    const creditCards = banksQuery.data?.filter((b) => b.isCredit) ?? [];
    const regularBanks = banksQuery.data?.filter((b) => !b.isCredit) ?? [];

    const selectedCCId = ccForm.watch("creditCardId");
    const selectedBankId = ccForm.watch("bankId");
    const selectedCC = creditCards.find((c) => c.id === selectedCCId);
    const selectedBank = regularBanks.find((b) => b.id === selectedBankId);
    const ccDescription = selectedCC && selectedBank
        ? `CC Bill Payment (${selectedBank.bankName} – ${selectedBank.accountName} to ${selectedCC.accountName})`
        : "";

    const handleCategoryChange = useCallback((value: string) => {
        form.setValue("category", value);
    }, [form]);

    const handleBankChange = useCallback((value: string | undefined) => {
        form.setValue("bankId", value);
    }, [form]);

    const router = useRouter();
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: CreateTransaction,
        onError: () => {
            toast.error("Something went wrong", { id: "create-transaction" });
        },
        onSuccess: () => {
            toast.success("Transaction created successfully 🎉", { id: "create-transaction" });
            form.reset({ type, description: "", amount: 0, date: new Date(), category: undefined, bankId: undefined, merchantName: undefined });
            queryClient.invalidateQueries({ queryKey: ["overview"] });
            queryClient.invalidateQueries({ queryKey: ["bank-history"] });
            router.refresh();
            setOpen(false);
        }
    });

    const { mutate: mutateCC, isPending: isPendingCC } = useMutation({
        mutationFn: CreateCCBillPayment,
        onError: () => {
            toast.error("Something went wrong", { id: "cc-payment" });
        },
        onSuccess: () => {
            toast.success("CC bill payment recorded 🎉", { id: "cc-payment" });
            ccForm.reset({ date: new Date() });
            queryClient.invalidateQueries({ queryKey: ["overview"] });
            queryClient.invalidateQueries({ queryKey: ["bank-history"] });
            queryClient.invalidateQueries({ queryKey: ["banks"] });
            router.refresh();
            setOpen(false);
        }
    });

    const onSubmit = useCallback((values: CreateTransactionSchemaType) => {
        toast.loading("Creating transaction...", { id: "create-transaction" });
        mutate({ ...values, date: DateToUTCDate(values.date) });
    }, [mutate]);

    const onCCSubmit = useCallback((values: CreateCCBillPaymentSchemaType) => {
        toast.loading("Recording payment...", { id: "cc-payment" });
        mutateCC({ ...values, date: DateToUTCDate(values.date) });
    }, [mutateCC]);

    const handleOpenChange = (next: boolean) => {
        if (!next) {
            setIsCCPayment(false);
            setCcDate(new Date());
            form.reset({ type, date: new Date() });
            ccForm.reset({ date: new Date() });
        }
        setOpen(next);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {isCCPayment ? (
                            <span className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-violet-500" />
                                CC Bill Payment
                            </span>
                        ) : (
                            <>Create a new{" "}
                                <span className={cn("m-1", type === "income" ? "text-emerald-500" : "text-rose-500")}>
                                    {type}
                                </span>
                                {" "}transaction
                            </>
                        )}
                    </DialogTitle>
                </DialogHeader>

                {isCCPayment ? (
                    <Form {...ccForm}>
                        <form className="space-y-4" onSubmit={ccForm.handleSubmit(onCCSubmit)}>
                            <FormField
                                control={ccForm.control}
                                name="creditCardId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Credit Card</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={(val) => ccForm.setValue("creditCardId", val, { shouldValidate: true })} value={field.value}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select credit card" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {creditCards.map((cc) => (
                                                        <SelectItem key={cc.id} value={cc.id}>
                                                            <div className="flex items-center gap-2">
                                                                <img src={getBankLogo(cc.bankName)} alt={cc.bankName} className="h-4 w-4 object-contain rounded shrink-0" />
                                                                {cc.bankName} – {cc.accountName}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={ccForm.control}
                                name="bankId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Pay From</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={(val) => ccForm.setValue("bankId", val, { shouldValidate: true })} value={field.value}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select bank account" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {regularBanks.map((b) => (
                                                        <SelectItem key={b.id} value={b.id}>
                                                            <div className="flex items-center gap-2">
                                                                <img src={getBankLogo(b.bankName)} alt={b.bankName} className="h-4 w-4 object-contain rounded shrink-0" />
                                                                {b.bankName} – {b.accountName}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={ccForm.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Amount</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={ccForm.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Date</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant={"outline"} className="w-full pl-3 text-left font-normal">
                                                        {formatIST(ccDate, "PPP")}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={ccDate}
                                                    onSelect={(v) => { if (v) { setCcDate(v); field.onChange(v); } }}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {ccDescription && (
                                <p className="text-xs text-muted-foreground rounded-md border p-2 bg-muted/40">
                                    {ccDescription}
                                </p>
                            )}
                        </form>
                    </Form>
                ) : (
                    <Form {...form}>
                        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Input defaultValue={""} {...field} />
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
                                            <Input defaultValue={0} type="number" {...field} />
                                        </FormControl>
                                        <FormDescription>Transaction amount</FormDescription>
                                    </FormItem>
                                )}
                            />

                            <div className="flex items-center justify-between gap-2">
                                <FormField
                                    control={form.control}
                                    name="category"
                                    render={({}) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Category</FormLabel>
                                            <FormControl>
                                                <CategoryPicker type={type} onChange={handleCategoryChange} />
                                            </FormControl>
                                            <FormDescription>Select a category for this transaction</FormDescription>
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
                                                        <Button variant={"outline"} className={cn("w-[200px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                            {field.value ? formatIST(field.value, "PPP") : <span>Pick a date</span>}
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
                                            <FormDescription>Select a date for this transaction</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="bankId"
                                render={({}) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Source <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                                        <FormControl>
                                            <BankPicker ttype={type} onChange={handleBankChange} className="w-full" />
                                        </FormControl>
                                        <FormDescription>Select the source of transaction</FormDescription>
                                    </FormItem>
                                )}
                            />

                            {type === "expense" && (
                                <FormField
                                    control={form.control}
                                    name="merchantName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Merchant <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Amazon, Swiggy, Zomato" {...field} />
                                            </FormControl>
                                            <FormDescription>Where was this expense made?</FormDescription>
                                        </FormItem>
                                    )}
                                />
                            )}
                        </form>
                    </Form>
                )}

                <DialogFooter className="flex-row items-center justify-between gap-2">
                    <div>
                        {type === "expense" && (
                            <Button
                                type="button"
                                variant={isCCPayment ? "default" : "outline"}
                                size="sm"
                                className="gap-1.5"
                                onClick={() => setIsCCPayment((v) => !v)}
                            >
                                <CreditCard className="h-3.5 w-3.5" />
                                CC Bill Payment
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <DialogClose asChild>
                            <Button variant={"secondary"} type="button" onClick={() => { form.reset(); ccForm.reset({ date: new Date() }); }}>Cancel</Button>
                        </DialogClose>
                        {isCCPayment ? (
                            <Button onClick={ccForm.handleSubmit(onCCSubmit)} disabled={isPendingCC}>
                                {!isPendingCC && "Pay Bill"}
                                {isPendingCC && <Loader2 className="animate-spin" />}
                            </Button>
                        ) : (
                            <Button onClick={form.handleSubmit(onSubmit)} disabled={isPending}>
                                {!isPending && "Create"}
                                {isPending && <Loader2 className="animate-spin" />}
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
