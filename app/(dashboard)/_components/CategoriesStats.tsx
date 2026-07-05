"use client";

import { GetCategoryStatsResponseType } from "@/app/api/stats/categories/route";
import { GetMerchantStatsResponseType } from "@/app/api/stats/merchants/route";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { GetFormatterForCurrency } from "@/lib/helpers";
import { UserSettings } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { format, toDate } from "date-fns";
import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
// import { Cell, Pie, PieChart, Sector, Tooltip } from "recharts";
import { Cell, Pie, PieChart, Sector } from "recharts";

const CHART_COLORS = [
    "#22c55e",
    "#f59e0b",
    "#ec4899",
    "#ef4444",
    "#6b7280",
    "#3b82f6",
    "#8b5cf6",
    "#f97316",
    "#14b8a6",
    "#e11d48",
];

interface Props {
    from: Date;
    to: Date;
    userSettings: UserSettings;
}

export default function CategoriesStats({ from, to, userSettings }: Props) {
    const currencyFmt = useMemo(
        () => GetFormatterForCurrency(userSettings.currency),
        [userSettings.currency]
    );

    const statsQuery = useQuery<GetCategoryStatsResponseType>({
        queryKey: ["overview", "stats", "categories", from, to],
        queryFn: () =>
            fetch(`/api/stats/categories?from=${toDate(from)}&to=${toDate(to)}`).then((r) =>
                r.json()
            ),
    });

    const merchantsQuery = useQuery<GetMerchantStatsResponseType>({
        queryKey: ["overview", "stats", "merchants", from, to],
        queryFn: () =>
            fetch(`/api/stats/merchants?from=${toDate(from)}&to=${toDate(to)}`).then((r) =>
                r.json()
            ),
    });

    return (
        <div className="flex w-full flex-wrap md:flex-nowrap gap-4 my-6">
            <SkeletonWrapper isLoading={statsQuery.isLoading}>
                <WhereMoneyWent
                    currencyFmt={currencyFmt}
                    from={from}
                    to={to}
                    data={statsQuery.data || []}
                />
            </SkeletonWrapper>

            <SkeletonWrapper isLoading={merchantsQuery.isLoading}>
                <TopMerchants currencyFmt={currencyFmt} data={merchantsQuery.data || []} />
            </SkeletonWrapper>
        </div>
    );
}

function WhereMoneyWent({
    currencyFmt,
    from,
    to,
    data,
}: {
    currencyFmt: Intl.NumberFormat;
    from: Date;
    to: Date;
    data: GetCategoryStatsResponseType;
}) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const filteredData = data.filter((item) => item.type === "expense");
    const total = filteredData.reduce((acc, el) => acc + (el._sum?.amount || 0), 0);

    const pieData = filteredData.map((item, i) => ({
        name: item.category,
        icon: item.categoryIcon,
        value: item._sum?.amount || 0,
        color: CHART_COLORS[i % CHART_COLORS.length],
    }));

    const activeSlice = activeIndex !== null ? pieData[activeIndex] : null;
    const activePct =
        activeSlice && total > 0 ? Math.round((activeSlice.value / total) * 100) : 0;

    const renderActiveShape = (props: any) => {
        const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
        return (
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius - 3}
                outerRadius={outerRadius + 7}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
            />
        );
    };

    return (
        <Card className="w-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-2xl font-semibold">Where the money went</CardTitle>
                <p className="text-xs text-muted-foreground">
                    {format(from, "MMM d")} – {format(to, "MMM d")}
                </p>
            </CardHeader>
            <div className="p-6 pt-2">
                {pieData.length === 0 ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-1 text-center text-muted-foreground">
                        <p>No expenses for this period</p>
                        <p className="text-xs">
                            Try selecting a different date range or add expense transactions
                        </p>
                    </div>
                ) : (
                    <div className="flex items-center gap-6">
                        {/* Donut chart */}
                        <div className="relative shrink-0" style={{ width: 200, height: 200 }}>
                            <PieChart width={200} height={200}>
                                <Pie
                                    data={pieData}
                                    cx={100}
                                    cy={100}
                                    innerRadius={58}
                                    outerRadius={88}
                                    dataKey="value"
                                    stroke="none"
                                    activeIndex={activeIndex ?? undefined}
                                    activeShape={renderActiveShape}
                                    onMouseEnter={(_, index) => setActiveIndex(index)}
                                    onMouseLeave={() => setActiveIndex(null)}
                                >
                                    {pieData.map((entry, i) => (
                                        <Cell
                                            key={i}
                                            fill={entry.color}
                                            opacity={
                                                activeIndex === null || activeIndex === i ? 1 : 0.3
                                            }
                                            style={{ cursor: "pointer", borderRadius: "100%" }}
                                        />
                                    ))}
                                </Pie>
                                {/* <Tooltip
                                    content={({ active, payload }) => {
                                        if (!active || !payload?.length) return null;
                                        return (
                                            <div className="rounded-lg border bg-background p-2 shadow-md text-sm">
                                                <p className="font-medium">{payload[0].name}</p>
                                                <p className="text-muted-foreground">
                                                    {currencyFmt.format(payload[0].value as number)}
                                                </p>
                                            </div>
                                        );
                                    }}
                                /> */}
                            </PieChart>
                            {/* Center text */}
                            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center ml-2 mt-2">
                                {activeSlice ? (
                                    <>
                                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                            {activeSlice.name}
                                        </p>
                                        <p className="text-base font-bold">
                                            {currencyFmt.format(activeSlice.value)}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {activePct}% of spend
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                            Total
                                        </p>
                                        <p className="text-base font-bold">
                                            {currencyFmt.format(total)}
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex-1 space-y-1 overflow-hidden">
                            {pieData.map((item, i) => {
                                const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                                const isActive = activeIndex === i;
                                return (
                                    <div
                                        key={i}
                                        className={cn(
                                            "flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                                            isActive
                                                ? "bg-muted"
                                                : "hover:bg-muted/50",
                                            activeIndex !== null && !isActive
                                                ? "opacity-40"
                                                : "opacity-100"
                                        )}
                                        onMouseEnter={() => setActiveIndex(i)}
                                        onMouseLeave={() => setActiveIndex(null)}
                                    >
                                        <div className="flex min-w-0 items-center gap-2">
                                            <span
                                                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                                                style={{ background: item.color }}
                                            />
                                            <span className="truncate">
                                                {item.icon} {item.name}
                                            </span>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-4">
                                            <span className="text-muted-foreground">{pct}%</span>
                                            <span className="font-semibold">
                                                {currencyFmt.format(item.value)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}

function TopMerchants({
    currencyFmt,
    data,
}: {
    currencyFmt: Intl.NumberFormat;
    data: GetMerchantStatsResponseType;
}) {
    const [view, setView] = useState<"amount" | "visits">("amount");

    const sortedData = useMemo(
        () =>
            [...data].sort((a, b) =>
                view === "amount" ? b.amount - a.amount : b.count - a.count
            ),
        [data, view]
    );

    const maxVal =
        view === "amount" ? sortedData[0]?.amount || 1 : sortedData[0]?.count || 1;

    return (
        <Card className="w-full">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-2xl font-semibold">Top merchants</CardTitle>
                    <div className="flex rounded-lg border p-0.5">
                        <Button
                            variant={view === "amount" ? "secondary" : "ghost"}
                            size="sm"
                            className="h-7 px-3 text-xs"
                            onClick={() => setView("amount")}
                        >
                            Amount
                        </Button>
                        <Button
                            variant={view === "visits" ? "secondary" : "ghost"}
                            size="sm"
                            className="h-7 px-3 text-xs"
                            onClick={() => setView("visits")}
                        >
                            Visits
                        </Button>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">Who you paid the most this month</p>
            </CardHeader>
            <div className="px-6 pb-6 pt-2">
                {sortedData.length === 0 ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground">
                        <p>No merchant data for this period</p>
                        <p className="text-xs">Add merchant names when creating expenses</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sortedData.slice(0, 6).map((merchant, i) => {
                            const pct =
                                ((view === "amount" ? merchant.amount : merchant.count) / maxVal) *
                                100;
                            const color = CHART_COLORS[i % CHART_COLORS.length];
                            return (
                                <div key={merchant.name} className="flex items-start gap-3">
                                    <div
                                        className="mt-0.5 flex text-xl shrink-0 items-center justify-center rounded-full"
                                        // style={{ background: `${color}22` }}
                                    >
                                        {merchant.icon}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-1 flex items-center justify-between">
                                            <span className="truncate font-medium text-sm">
                                                {merchant.name}
                                            </span>
                                            <span className="ml-2 shrink-0 font-bold text-sm">
                                                {view === "amount"
                                                    ? currencyFmt.format(merchant.amount)
                                                    : `${merchant.count} ${merchant.count === 1 ? "visit" : "visits"}`}
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${pct}%`,
                                                    background: color,
                                                }}
                                            />
                                        </div>
                                        {/* <p className="mt-0.5 text-xs text-muted-foreground">
                                            {merchant.count}{" "}
                                            {merchant.count === 1 ? "visit" : "visits"}
                                        </p> */}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Card>
    );
}
