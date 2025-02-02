"use client";

import { DateRangePicker } from "@/components/ui/date-range-picker";
import { MAX_DATE_RANGE_DAYS } from "@/lib/constants";
import { UserSettings } from "@prisma/client";
import { differenceInBusinessDays, startOfMonth } from "date-fns";
import React from "react";
import { toast } from "sonner";
import StatsCards from "./StatsCards";
import CategoriesStats from "./CategoriesStats";

export default function Overview({ userSettings }: { userSettings: UserSettings }) {

    const [dateRange, setDateRange] = React.useState<{from: Date, to: Date}>({
        from: startOfMonth(new Date()),
        to: new Date(),
    });



    return (
        <div className="px-8">
            <div className="container flex flex-wrap items-end justify-between gap-2 py-6">
                <h2 className="text-3xl font-bold">Overview</h2>
                <div className="flex items-center gap-3">
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
            
            <StatsCards userSettings={userSettings} from={dateRange.from} to={dateRange.to} />
            <CategoriesStats userSettings={userSettings} from={dateRange.from} to={dateRange.to} />
        </div>
    );
}