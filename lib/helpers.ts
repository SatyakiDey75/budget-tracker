import { format } from "date-fns";
import { Currencies } from "./currencies";

export function DateToUTCDate(date: Date): Date {
    return new Date(
        Date.UTC(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            date.getHours(),
            date.getMinutes(),
            date.getSeconds(),
            date.getMilliseconds()
        )
    );
}

// Format a stored transaction date for display.
// Both old records (IST hours baked into UTC) and new records (midnight UTC)
// share the same invariant: getUTC* components = the intended IST calendar date.
// Reading UTC components and re-wrapping as a local date lets date-fns format
// the correct calendar date without any timezone dependency.
export function formatIST(date: Date | string | number, fmt: string): string {
    const d = new Date(date);
    const utcAsLocal = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    return format(utcAsLocal, fmt);
}

export function GetFormatterForCurrency(currency: string) {
    const locale = Currencies.find((c) => c.value === currency)?.locale;

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
    });
}