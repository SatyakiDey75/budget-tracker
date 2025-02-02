"use client";

import { GetBalancedStatsResponseType } from "@/app/api/stats/balance/route";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Card } from "@/components/ui/card";
import { GetFormatterForCurrency } from "@/lib/helpers";
import { UserSettings } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { toDate } from "date-fns";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import React, { useCallback, useMemo } from "react";
import CountUp from "react-countup";

interface Props {
    from: Date,
    to: Date,
    userSettings: UserSettings,
}

export default function StatsCards({ from, to, userSettings }: Props) {

    const statsQuery = useQuery<GetBalancedStatsResponseType>({
        queryKey: ["overview", "stats", from, to],
        queryFn: () => fetch(`/api/stats/balance?from=${toDate(from)}&to=${toDate(to)}`).then((res) => res.json()),
    });

    const formatter = useMemo(() => {
        return GetFormatterForCurrency(userSettings.currency);
    }, [userSettings.currency]);

    const income = statsQuery.data?.income || 0;
    const expense = statsQuery.data?.expense || 0;

    const balance = income - expense;

    return (
        <div className="relative flex w-full flex-wrap gap-4 md:flex-nowrap">
            <SkeletonWrapper isLoading={statsQuery.isLoading}>
                <StatCard 
                    formatter={formatter} 
                    title="Income"
                    value={income}
                    icon={<TrendingUp className="h-12 w-12 items-center rounded-lg p-2 text-emerald-500 bg-emerald-400/10" />}
                />
            </SkeletonWrapper>
            
            <SkeletonWrapper isLoading={statsQuery.isLoading}>
                <StatCard 
                    formatter={formatter} 
                    title="Expense"
                    value={expense}
                    icon={<TrendingDown className="h-12 w-12 items-center rounded-lg p-2 text-rose-500 bg-rose-400/10" />}
                />
            </SkeletonWrapper>
            
            <SkeletonWrapper isLoading={statsQuery.isLoading}>
                <StatCard 
                    formatter={formatter} 
                    title="Balance"
                    value={balance}
                    icon={<Wallet className="h-12 w-12 items-center rounded-lg p-2 text-violet-500 bg-violet-400/10" />}
                />
            </SkeletonWrapper>
        </div>
    );
}

function StatCard({ title, value, icon, formatter }: { title: string, value: number, icon: React.ReactNode, formatter: Intl.NumberFormat }) {
    const formatFn = useCallback((value: number) => {
        return formatter.format(value);
    }, [formatter]);
    
    return (
        <Card className="flex h-24 w-full items-center gap-2 p-4">
            {icon}
            <div className="flex flex-col gap-0 items-start ml-2">
                <p className="text-muted-foreground">{title}</p>
                <CountUp
                    preserveValue
                    redraw={false}
                    end={value}
                    decimals={2}
                    formattingFn={formatFn}
                    className="text-2xl"
                />
            </div>
        </Card>
    )
}