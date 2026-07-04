"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GetFormatterForCurrency } from "@/lib/helpers";
import { Period, TimeFrame } from "@/lib/types";
import { UserSettings } from "@prisma/client";
import React, { useMemo, useState } from "react";
import HistoryPeriodSelector from "./HistoryPeriodSelector";
import { useQuery } from "@tanstack/react-query";
import { GetBankHistoryResponseType } from "@/app/api/bank-history/route";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";

const BANK_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#f43f5e"];

type BankMeta = { id: string; bankName: string; accountName: string };

export default function BankBalanceHistory({ userSettings }: { userSettings: UserSettings }) {
    const [timeFrame, setTimeFrame] = useState<TimeFrame>("month");
    const [period, setPeriod] = useState<Period>({
        month: new Date().getMonth(),
        year: new Date().getFullYear(),
    });
    const [viewMode, setViewMode] = useState<"combined" | "individual">("individual");
    // null = all banks shown; a bank id = only that bank shown
    const [selectedBankId, setSelectedBankId] = useState<string | null>(null);

    const currencyFormatter = useMemo(
        () => GetFormatterForCurrency(userSettings.currency),
        [userSettings.currency]
    );

    const query = useQuery<GetBankHistoryResponseType>({
        queryKey: ["bank-history", timeFrame, period],
        queryFn: () =>
            fetch(
                `/api/bank-history?timeFrame=${timeFrame}&year=${period.year}&month=${period.month}`
            ).then((res) => res.json()),

        select: (data) => {
            const creditCardIds = data.banks
                .filter((bank) => bank.bankName.toLowerCase().includes("credit card"))
                .map((bank) => bank.id);

            const remainingBanks = data.banks.filter(
                (bank) => !creditCardIds.includes(bank.id)
            );

            return {
                ...data,
                banks: remainingBanks,
                data: data.data.map((row) => {
                    const newRow = { ...row };
                    creditCardIds.forEach((id) => delete newRow[id]);
                    newRow.total = remainingBanks.reduce(
                        (sum, bank) => sum + (Number(newRow[bank.id]) || 0),
                        0
                    );
                    return newRow;
                }),
            };
        },
    });

    const dataAvailable =
        query.data && query.data.data.length > 0 && query.data.banks.length > 0;

    // When switching away from individual, clear the selection
    const handleViewModeChange = (mode: "combined" | "individual") => {
        setViewMode(mode);
        setSelectedBankId(null);
    };

    const handleBadgeClick = (bankId: string) => {
        setSelectedBankId((prev) => (prev === bankId ? null : bankId));
    };

    // Which banks to render lines for
    const visibleBanks = useMemo(() => {
        if (!query.data?.banks) return [];
        if (viewMode !== "individual" || selectedBankId === null) return query.data.banks;
        return query.data.banks.filter((b) => b.id === selectedBankId);
    }, [query.data?.banks, viewMode, selectedBankId]);

    return (
        <div className="pb-8 px-8">
            <h2 className="mt-12 text-3xl font-bold">Bank Balance</h2>
            <Card className="col-span-12 mt-2 w-full">
                <CardHeader className="gap-2">
                    <CardTitle className="grid grid-flow-row justify-between gap-2 md:grid-flow-col">
                        <HistoryPeriodSelector
                            timeFrame={timeFrame}
                            setTimeFrame={setTimeFrame}
                            period={period}
                            setPeriod={setPeriod}
                        />

                        <div className="flex h-10 gap-2 flex-wrap items-center">
                            {/* View mode toggles */}
                            <Badge
                                variant={viewMode === "combined" ? "default" : "outline"}
                                className="cursor-pointer flex items-center gap-2 text-sm select-none"
                                onClick={() => handleViewModeChange("combined")}
                            >
                                Combined
                            </Badge>
                            <Badge
                                variant={viewMode === "individual" ? "default" : "outline"}
                                className="cursor-pointer flex items-center gap-2 text-sm select-none"
                                onClick={() => handleViewModeChange("individual")}
                            >
                                Individual
                            </Badge>

                            {/* Per-bank filter badges (individual mode only) */}
                            {viewMode === "individual" &&
                                query.data?.banks.map((bank, i) => {
                                    const isHighlighted =
                                        selectedBankId === null || selectedBankId === bank.id;
                                    return (
                                        <Badge
                                            key={bank.id}
                                            variant={selectedBankId === bank.id ? "default" : "outline"}
                                            className={cn(
                                                "cursor-pointer flex items-center gap-2 text-sm select-none transition-opacity",
                                                !isHighlighted && "opacity-40"
                                            )}
                                            onClick={() => handleBadgeClick(bank.id)}
                                        >
                                            <div
                                                className="h-4 w-4 rounded-full shrink-0"
                                                style={{
                                                    backgroundColor: BANK_COLORS[i % BANK_COLORS.length],
                                                }}
                                            />
                                            {bank.bankName}
                                        </Badge>
                                    );
                                })}

                            {/* Combined mode label */}
                            {viewMode === "combined" && (
                                <Badge variant="outline" className="flex items-center gap-2 text-sm">
                                    <div className="h-4 w-4 rounded-full bg-blue-500" />
                                    Total
                                </Badge>
                            )}
                        </div>
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    <SkeletonWrapper isLoading={query.isLoading}>
                        {dataAvailable && (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart height={300} data={query.data!.data}>
                                    <defs>
                                        {query.data!.banks.map((bank, i) => (
                                            <linearGradient
                                                key={bank.id}
                                                id={`gradient-${bank.id}`}
                                                x1="0" y1="0" x2="0" y2="1"
                                            >
                                                <stop
                                                    offset="0"
                                                    stopColor={BANK_COLORS[i % BANK_COLORS.length]}
                                                    stopOpacity="0.3"
                                                />
                                                <stop
                                                    offset="1"
                                                    stopColor={BANK_COLORS[i % BANK_COLORS.length]}
                                                    stopOpacity="0"
                                                />
                                            </linearGradient>
                                        ))}
                                    </defs>

                                    <CartesianGrid
                                        strokeDasharray="5 5"
                                        strokeOpacity="0.2"
                                        vertical={false}
                                    />

                                    <XAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        padding={{ left: 5, right: 5 }}
                                        dataKey={(data) => {
                                            const { year, month, day } = data;
                                            const date = new Date(year, month, day || 1);
                                            if (timeFrame === "year") {
                                                return date.toLocaleString("default", { month: "long" });
                                            }
                                            return date.toLocaleDateString("default", { day: "2-digit" });
                                        }}
                                    />

                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(v) => currencyFormatter.format(v)}
                                        width={80}
                                    />

                                    <Tooltip
                                        cursor={{ opacity: 0.1 }}
                                        content={(props) => (
                                            <BankTooltip
                                                active={props.active}
                                                payload={props.payload}
                                                currencyFormatter={currencyFormatter}
                                                viewMode={viewMode}
                                                banks={query.data!.banks}
                                                selectedBankId={selectedBankId}
                                            />
                                        )}
                                    />

                                    {viewMode === "combined" ? (
                                        <Line
                                            type="monotone"
                                            dataKey="total"
                                            name="Total Balance"
                                            stroke="#3b82f6"
                                            strokeWidth={2}
                                            dot={false}
                                            activeDot={{ r: 4 }}
                                        />
                                    ) : (
                                        visibleBanks.map((bank) => {
                                            const originalIndex = query.data!.banks.findIndex(
                                                (b) => b.id === bank.id
                                            );
                                            return (
                                                <Line
                                                    key={bank.id}
                                                    type="monotone"
                                                    dataKey={bank.id}
                                                    name={`${bank.bankName} – ${bank.accountName}`}
                                                    stroke={BANK_COLORS[originalIndex % BANK_COLORS.length]}
                                                    strokeWidth={2}
                                                    dot={false}
                                                    activeDot={{ r: 4 }}
                                                />
                                            );
                                        })
                                    )}
                                </LineChart>
                            </ResponsiveContainer>
                        )}

                        {!dataAvailable && (
                            <Card className="flex flex-col h-[300px] items-center justify-center bg-background">
                                No bank balance data for the selected period
                                <p className="text-sm text-muted-foreground">
                                    Add bank accounts and link transactions to see balance history
                                </p>
                            </Card>
                        )}
                    </SkeletonWrapper>
                </CardContent>
            </Card>
        </div>
    );
}

function BankTooltip({
    active,
    payload,
    currencyFormatter,
    viewMode,
    banks,
    selectedBankId,
}: {
    active?: boolean;
    payload?: any[];
    currencyFormatter: Intl.NumberFormat;
    viewMode: "combined" | "individual";
    banks: BankMeta[];
    selectedBankId: string | null;
}) {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;

    if (viewMode === "combined") {
        return (
            <div className="min-w-[200px] rounded border bg-background p-4">
                <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-blue-500 shrink-0" />
                    <div className="flex w-full justify-between gap-4">
                        <p className="text-sm text-muted-foreground">Total Balance</p>
                        <span className="text-sm font-bold text-blue-500">
                            {currencyFormatter.format(data.total ?? 0)}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    const visibleBanks = selectedBankId
        ? banks.filter((b) => b.id === selectedBankId)
        : banks;

    return (
        <div className="min-w-[260px] rounded border bg-background p-4 space-y-1">
            {visibleBanks.map((bank) => {
                const originalIndex = banks.findIndex((b) => b.id === bank.id);
                return (
                    <div key={bank.id} className="flex items-center gap-2">
                        <div
                            className="h-4 w-4 rounded-full shrink-0"
                            style={{ backgroundColor: BANK_COLORS[originalIndex % BANK_COLORS.length] }}
                        />
                        <div className="flex w-full justify-between gap-4">
                            <p className={cn("text-sm text-muted-foreground truncate max-w-[130px]")}>
                                {bank.bankName} – {bank.accountName}
                            </p>
                            <span
                                className="text-sm font-bold shrink-0"
                                style={{ color: BANK_COLORS[originalIndex % BANK_COLORS.length] }}
                            >
                                {currencyFormatter.format((data[bank.id] as number) ?? 0)}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
