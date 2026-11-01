"use client";

import { CurrencyComboBox } from "@/components/CurrencyComboBox";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Landmark, PlusSquare, TrashIcon, TrendingDown, TrendingUp } from "lucide-react";
import React from "react";
import CreateCategoryDialog from "../_components/CreateCategoryDialog";
import CreateBankDialog from "../_components/CreateBankDialog";
import BankDetailsDialog from "../_components/BankDetailsDialog";
import CreateCardDialog from "../_components/CreateCardDialog";
import CardDetailsDialog from "../_components/CardDetailsDialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Category } from "@prisma/client";
import DeleteCategoryDialog from "../_components/DeleteCategoryDialog";
import { getBankLogo } from "@/lib/banks";
import { GetFormatterForCurrency } from "@/lib/helpers";

interface BankRecord {
    id: string;
    bankName: string;
    branch: string;
    accountName: string;
    balance: number;
    isCredit: boolean;
    limit: number;
}

export default function page() {
    return (
        <>
            <div className="border-b bg-card p-8">
                <div className="flex flex-col items-start justify-between gap-2">
                    <p className="text-3xl font-bold">Manage</p>
                    <p className="text-muted-foreground">
                        Manage your account settings and categories
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-4 p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Currency</CardTitle>
                        <CardDescription>Set your default currency for transactions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CurrencyComboBox />
                    </CardContent>
                </Card>
                <BankList />
                <CardList />
                <CategoryList type="income" />
                <CategoryList type="expense" />
            </div>
        </>
    );
}

function BankList() {
    const banksQuery = useQuery<BankRecord[]>({
        queryKey: ["banks"],
        queryFn: () => fetch("/api/banks").then((res) => res.json()),
    });

    const settingsQuery = useQuery({
        queryKey: ["user-settings"],
        queryFn: () => fetch("/api/user-settings").then((res) => res.json()),
    });

    const formatter = settingsQuery.data?.currency
        ? GetFormatterForCurrency(settingsQuery.data.currency)
        : null;

    const dataAvailable = banksQuery.data && banksQuery.data.length > 0;

    return (
        <SkeletonWrapper isLoading={banksQuery.isLoading}>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Landmark className="h-12 w-12 items-center rounded-lg bg-blue-400/10 p-2 text-blue-500" />
                            <div className="ml-2">
                                Banks
                                <div className="text-sm font-normal text-muted-foreground">
                                    Your linked bank accounts
                                </div>
                            </div>
                        </div>
                        <CreateBankDialog
                            trigger={
                                <Button className="gap-2 text-sm">
                                    <PlusSquare className="h-4 w-4" />
                                    Add Bank
                                </Button>
                            }
                        />
                    </CardTitle>
                </CardHeader>

                <Separator />

                {!dataAvailable && (
                    <div className="flex h-40 w-full items-center flex-col justify-center">
                        <p>No bank accounts yet</p>
                        <p className="text-sm text-muted-foreground">Add one to get started</p>
                    </div>
                )}

                {dataAvailable && (
                    <div className="grid grid-flow-row gap-4 p-6 sm:grid-flow-row sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {banksQuery.data.filter((b) => !b.isCredit).map((bank) => (
                            <BankCard key={bank.id} bank={bank} formatter={formatter} />
                        ))}
                    </div>
                )}
            </Card>
        </SkeletonWrapper>
    );
}

function BankCard({ bank, formatter }: { bank: BankRecord; formatter: Intl.NumberFormat | null }) {
    const [open, setOpen] = React.useState(false);

    return (
        <>
            <BankDetailsDialog bank={bank} open={open} setOpen={setOpen} />
            <div
                className="flex border-separate flex-col justify-between rounded-md border shadow-md shadow-black/[0.1] dark:shadow-white/[0.1] cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => setOpen(true)}
            >
                <div className="flex flex-col items-center gap-2 p-4">
                    <img
                        src={getBankLogo(bank.bankName)}
                        alt={bank.bankName}
                        className="h-12 w-12 object-contain rounded-md"
                    />
                    <span className="font-medium text-sm text-center">{bank.bankName}</span>
                    <span className="text-xs text-muted-foreground text-center">{bank.accountName}</span>
                    <span className="text-sm font-semibold">
                        {formatter ? formatter.format(bank.balance) : bank.balance.toLocaleString()}
                    </span>
                </div>
            </div>
        </>
    );
}

function CardList() {
    const banksQuery = useQuery<BankRecord[]>({
        queryKey: ["banks"],
        queryFn: () => fetch("/api/banks").then((res) => res.json()),
    });

    const settingsQuery = useQuery({
        queryKey: ["user-settings"],
        queryFn: () => fetch("/api/user-settings").then((res) => res.json()),
    });

    const formatter = settingsQuery.data?.currency
        ? GetFormatterForCurrency(settingsQuery.data.currency)
        : null;

    const cards = banksQuery.data?.filter((b) => b.isCredit) ?? [];

    return (
        <SkeletonWrapper isLoading={banksQuery.isLoading}>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <CreditCard className="h-12 w-12 items-center rounded-lg bg-violet-400/10 p-2 text-violet-500" />
                            <div className="ml-2">
                                Cards
                                <div className="text-sm font-normal text-muted-foreground">
                                    Your credit cards
                                </div>
                            </div>
                        </div>
                        <CreateCardDialog
                            trigger={
                                <Button className="gap-2 text-sm">
                                    <PlusSquare className="h-4 w-4" />
                                    Add Card
                                </Button>
                            }
                        />
                    </CardTitle>
                </CardHeader>

                <Separator />

                {cards.length === 0 && (
                    <div className="flex h-40 w-full items-center flex-col justify-center">
                        <p>No credit cards yet</p>
                        <p className="text-sm text-muted-foreground">Add one to get started</p>
                    </div>
                )}

                {cards.length > 0 && (
                    <div className="grid grid-flow-row gap-4 p-6 sm:grid-flow-row sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {cards.map((card) => (
                            <CreditCardCard key={card.id} card={card} formatter={formatter} />
                        ))}
                    </div>
                )}
            </Card>
        </SkeletonWrapper>
    );
}

function CreditCardCard({ card, formatter }: { card: BankRecord; formatter: Intl.NumberFormat | null }) {
    const [open, setOpen] = React.useState(false);
    const used = Math.max(0, card.limit - card.balance);
    const usedPercent = card.limit > 0 ? Math.min(100, (used / card.limit) * 100) : 0;

    return (
        <>
            <CardDetailsDialog card={card} open={open} setOpen={setOpen} />
            <div
                className="flex border-separate flex-col justify-between rounded-md border shadow-md shadow-black/[0.1] dark:shadow-white/[0.1] cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => setOpen(true)}
            >
                <div className="flex flex-col items-center gap-2 p-4">
                    <img
                        src={getBankLogo(card.bankName)}
                        alt={card.bankName}
                        className="h-12 w-12 object-contain rounded-md"
                    />
                    <span className="font-medium text-sm text-center">{card.bankName}</span>
                    <span className="text-xs text-muted-foreground text-center">{card.accountName}</span>
                    <span className="text-sm font-semibold">
                        {formatter ? formatter.format(card.balance) : card.balance.toLocaleString()}
                    </span>
                    <div className="w-full space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Used {Math.round(usedPercent)}%</span>
                            <span>Limit: {formatter ? formatter.format(card.limit) : card.limit.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                                className="h-full rounded-full bg-violet-500"
                                style={{ width: `${usedPercent}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

function CategoryList({ type }: { type: "income" | "expense" }) {
    const categoriesQuery = useQuery({
        queryKey: ["categories", type],
        queryFn: () => fetch(`/api/categories?type=${type}`).then((res) => res.json()),
    });

    const dataAvailable = categoriesQuery.data && categoriesQuery.data.length > 0;

    return (
        <SkeletonWrapper isLoading={categoriesQuery.isLoading}>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            {type === "income" ? (
                                <TrendingUp className="h-12 w-12 items-center rounded-lg bg-emerald-400/10 p-2 text-emerald-500" />
                            ) : (
                                <TrendingDown className="h-12 w-12 items-center rounded-lg bg-rose-400/10 p-2 text-rose-500" />
                            )}

                            <div className="ml-2">
                                {type === "income" ? "Income" : "Expense"} categories
                                <div className="text-sm font-normal text-muted-foreground">
                                    Sorted by name
                                </div>
                            </div>
                        </div>
                        <CreateCategoryDialog
                            type={type}
                            successCallback={() => categoriesQuery.refetch}
                            trigger={
                                <Button className="gap-2 text-sm">
                                    <PlusSquare className="h-4 w-4" />
                                    Create Category
                                </Button>
                            }
                        />
                    </CardTitle>
                </CardHeader>

                <Separator />

                {!dataAvailable && (
                    <div className="flex h-40 w-full items-center flex-col justify-center">
                        <p>
                            No <span className={cn(
                                "m-1",
                                type === "income" ? "text-emerald-500" : "text-rose-500"
                            )}>{type}</span>
                            categories yet
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Create one to get started
                        </p>
                    </div>
                )}

                {dataAvailable && (
                    <div className="grid grid-flow-row gap-4 p-6 sm:grid-flow-row sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {categoriesQuery.data.map((category: Category) => (
                            <CategoryCard category={category} key={category.name} />
                        ))}
                    </div>
                )}
            </Card>
        </SkeletonWrapper>
    )
}

function CategoryCard({ category }: { category: Category }) {
    return (
        <div className="flex border-separate flex-col justify-between rounded-md border shadow-md shadow-black/[0.1] dark:shadow-white[0.1]">
            <div className="flex flex-col items-center gap-2 p-4">
                <span className="text-3xl" role="image">{category.icon}</span>
                <span>{category.name}</span>
            </div>
            <DeleteCategoryDialog
                category={category}
                trigger={
                    <Button
                        className="flex w-full border-separate items-center gap-2 rounded-t-none text-muted-foreground hover:bg-rose-500/20" variant={"secondary"}
                    >
                        <TrashIcon className="h-4 w-4" />
                        Remove
                    </Button>
                }
            />
        </div>
    )
}
