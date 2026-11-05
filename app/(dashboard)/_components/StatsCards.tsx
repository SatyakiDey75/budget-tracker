"use client";

import { GetBalancedStatsResponseType } from "@/app/api/stats/balance/route";
import { GetTrendResponseType } from "@/app/api/stats/trend/route";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Card } from "@/components/ui/card";
import { DateToUTCDate, GetFormatterForCurrency } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { UserSettings } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { endOfDay } from "date-fns";
import { ArrowDown, ArrowUp, Landmark, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import CountUp from "react-countup";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";

interface Props {
    from: Date;
    to: Date;
    userSettings: UserSettings;
}

type Period = "1m" | "3m" | "6m";

export default function StatsCards({ from, to, userSettings }: Props) {
    const statsQuery = useQuery<GetBalancedStatsResponseType>({
        queryKey: ["overview", "stats", from, to],
        queryFn: () =>
            fetch(`/api/stats/balance?from=${DateToUTCDate(from).toISOString()}&to=${DateToUTCDate(endOfDay(to)).toISOString()}`).then((res) => res.json()),
    });

    const trendQuery = useQuery<GetTrendResponseType>({
        queryKey: ["overview", "trend", from.getFullYear(), from.getMonth()],
        queryFn: () =>
            fetch(`/api/stats/trend?year=${from.getFullYear()}&month=${from.getMonth()}`).then((res) => res.json()),
        staleTime: 5 * 60 * 1000,
    });

    const formatter = useMemo(() => GetFormatterForCurrency(userSettings.currency), [userSettings.currency]);

    // Decide once per mount: show % or ₹ — same for all cards
    const usePercent = useMemo(() => Math.random() < 0.5, []);

    const compactFormatter = useMemo(
        () => new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: userSettings.currency,
            maximumFractionDigits: 2,
            notation: "compact",
        }),
        [userSettings.currency]
    );

    const income = statsQuery.data?.income || 0;
    const expense = statsQuery.data?.expense || 0;
    const investment = statsQuery.data?.investment || 0;
    const balance = income - expense - investment;

    const trend = trendQuery.data ?? [];

    return (
        <div className="relative flex w-full flex-wrap gap-4 md:flex-nowrap">
            <SkeletonWrapper isLoading={statsQuery.isLoading}>
                <StatCard
                    formatter={formatter}
                    compactFormatter={compactFormatter}
                    usePercent={usePercent}
                    title="Income"
                    value={income}
                    dataKey="income"
                    color="#10b981"
                    trend={trend}
                    icon={<TrendingUp className="h-10 w-10 items-center rounded-lg p-2 text-emerald-500 bg-emerald-400/10 shrink-0" />}
                />
            </SkeletonWrapper>

            <SkeletonWrapper isLoading={statsQuery.isLoading}>
                <StatCard
                    formatter={formatter}
                    compactFormatter={compactFormatter}
                    usePercent={usePercent}
                    title="Expense"
                    value={expense}
                    dataKey="expense"
                    color="#f43f5e"
                    trend={trend}
                    invertBadge
                    icon={<TrendingDown className="h-10 w-10 items-center rounded-lg p-2 text-rose-500 bg-rose-400/10 shrink-0" />}
                />
            </SkeletonWrapper>

            <SkeletonWrapper isLoading={statsQuery.isLoading}>
                <StatCard
                    formatter={formatter}
                    compactFormatter={compactFormatter}
                    usePercent={usePercent}
                    title="Invested"
                    value={investment}
                    dataKey="investment"
                    color="#3b82f6"
                    trend={trend}
                    icon={<Landmark className="h-10 w-10 items-center rounded-lg p-2 text-blue-500 bg-blue-400/10 shrink-0" />}
                />
            </SkeletonWrapper>

            <SkeletonWrapper isLoading={statsQuery.isLoading}>
                <StatCard
                    formatter={formatter}
                    compactFormatter={compactFormatter}
                    usePercent={usePercent}
                    title="Balance"
                    value={balance}
                    dataKey="balance"
                    color="#8b5cf6"
                    trend={trend}
                    icon={<Wallet className="h-10 w-10 items-center rounded-lg p-2 text-violet-500 bg-violet-400/10 shrink-0" />}
                />
            </SkeletonWrapper>
        </div>
    );
}

type TrendPoint = GetTrendResponseType[number];

function StatCard({
    title,
    value,
    icon,
    formatter,
    compactFormatter,
    usePercent,
    dataKey,
    color,
    trend,
    invertBadge = false,
}: {
    title: string;
    value: number;
    icon: React.ReactNode;
    formatter: Intl.NumberFormat;
    compactFormatter: Intl.NumberFormat;
    usePercent: boolean;
    dataKey: keyof TrendPoint;
    color: string;
    trend: TrendPoint[];
    invertBadge?: boolean;
}) {
    const formatFn = useCallback((v: number) => formatter.format(v), [formatter]);
    const [period, setPeriod] = useState<Period>("1m");

    const gradientId = `sparkline-${dataKey}`;

    const curr = trend.length >= 1 ? Number(trend[trend.length - 1][dataKey]) : 0;
    const prev = trend.length >= 2 ? Number(trend[trend.length - 2][dataKey]) : 0;
    const diff = curr - prev;
    const pct = prev !== 0 ? Math.round((diff / Math.abs(prev)) * 100) : null;

    const showBadge = diff !== 0 && (usePercent ? pct !== null && pct !== 0 : true);
    const isUp = diff > 0;
    const isGood = invertBadge ? !isUp : isUp;

    const badgeLabel = usePercent
        ? `${isUp ? "+" : ""}${pct}%`
        : `${isUp ? "+" : "-"}${compactFormatter.format(Math.abs(diff))}`;

    const value3m = trend.slice(-3).reduce((sum, slot) => sum + Number(slot[dataKey]), 0);
    const value6m = trend.reduce((sum, slot) => sum + Number(slot[dataKey]), 0);
    const displayValue = period === "1m" ? value : period === "3m" ? value3m : value6m;

    return (
        <Card className="flex flex-col w-full p-4 gap-3 overflow-hidden">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    {icon}
                    <p className="text-muted-foreground text-sm font-medium">{title}</p>
                </div>
                {showBadge && period === "1m" && (
                    <span className={cn(
                        "inline-flex items-center gap-0.5 text-xs rounded-full px-2 py-0.5 shrink-0",
                        isGood ? "text-emerald-500 bg-emerald-400/10" : "text-rose-500 bg-rose-400/10"
                    )}>
                        {isUp ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                        {badgeLabel}
                    </span>
                )}
            </div>

            <div className="flex items-center justify-between gap-2">
                <CountUp
                    preserveValue
                    redraw={false}
                    end={displayValue}
                    decimals={2}
                    formattingFn={formatFn}
                    className="text-2xl font-bold"
                />
                <div className="flex shrink-0 rounded-full border border-border overflow-hidden">
                    {(["1m", "3m", "6m"] as Period[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={cn(
                                "px-2.5 py-0.5 text-xs font-medium transition-colors",
                                period === p ? "font-semibold" : "text-muted-foreground hover:text-foreground"
                            )}
                            style={period === p ? { backgroundColor: `${color}25`, color } : undefined}
                        >
                            {p.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-14 -mx-4 -mb-4 mt-2">
                {trend.length > 0 && (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trend} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="15%" stopColor={color} stopOpacity={0.3} />
                                    <stop offset="85%" stopColor={color} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (!active || !payload?.length) return null;
                                    const d = payload[0].payload as TrendPoint;
                                    const monthName = new Date(d.year, d.month).toLocaleString("default", { month: "short", year: "2-digit" });
                                    return (
                                        <div className="rounded border bg-background px-2 py-1 text-xs shadow">
                                            <p className="text-muted-foreground">{monthName}</p>
                                            <p className="font-semibold" style={{ color }}>
                                                {formatter.format(Number(d[dataKey]))}
                                            </p>
                                        </div>
                                    );
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey={dataKey as string}
                                stroke={color}
                                strokeWidth={2}
                                fill={`url(#${gradientId})`}
                                dot={false}
                                activeDot={{ r: 3, fill: color }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </Card>
    );
}
