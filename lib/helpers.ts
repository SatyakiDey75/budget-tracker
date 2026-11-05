import { formatInTimeZone } from "date-fns-tz";
import { Currencies } from "./currencies";

const IST = "Asia/Kolkata";

// Store only the local calendar date as UTC midnight — strip the time component
// so a transaction entered at 8 PM IST still shows as that day, not the next.
export function DateToUTCDate(date: Date): Date {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

// Format any UTC/local date for display in IST — no dependency on server/browser TZ.
export function formatIST(date: Date | string | number, fmt: string): string {
    return formatInTimeZone(new Date(date), IST, fmt);
}

export function GetFormatterForCurrency(currency: string) {
    const locale = Currencies.find((c) => c.value === currency)?.locale;

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
    });
}