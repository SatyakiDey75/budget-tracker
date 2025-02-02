"use client";

import { DateRangePicker } from "@/components/ui/date-range-picker";
import { MAX_DATE_RANGE_DAYS } from "@/lib/constants";
import { differenceInBusinessDays, startOfMonth } from "date-fns";
import React from "react";
import { toast } from "sonner";
import TransactionTable from "./_components/TransactionTable";

export default function TransactionsPage() {
    const [dateRange, setDateRange] = React.useState<{ from: Date, to: Date }>({
        from: startOfMonth(new Date()),
        to: new Date(),
    });

    return (
        <>
            <div className="border-b bg-card">
                <div className="container flex flex-wrap items-center justify-between p-8 gap-6">
                    <div>
                        <p className="text-3xl font-bold">Transactions History</p>
                    </div>
                    <DateRangePicker
                        initialDateFrom={dateRange.from}
                        initialDateTo={dateRange.to}
                        showCompare={false}
                        onUpdate={(values) => {
                            const { from, to } = values.range;
                            
                            // we set date range only if both dates are defined
                            if (!from || !to) return;
                            if (differenceInBusinessDays(to, from) > MAX_DATE_RANGE_DAYS) {
                                toast.error(`Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days!`);
                                return;
                            };

                            setDateRange({ from, to });
                        }}
                    />
                </div>
            </div>

            <div className="container px-8 py-2">
                <TransactionTable from={dateRange.from} to={dateRange.to} />
            </div>
        </>
    );
}