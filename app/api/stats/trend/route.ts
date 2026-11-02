import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { z } from "zod";

const schema = z.object({
    year: z.coerce.number().int().min(2000).max(2100),
    month: z.coerce.number().int().min(0).max(11),
});

export async function GET(request: Request) {
    const user = await currentUser();
    if (!user) redirect("/sign-in");

    const { searchParams } = new URL(request.url);
    const parsed = schema.safeParse({
        year: searchParams.get("year"),
        month: searchParams.get("month"),
    });
    if (!parsed.success) return Response.json(parsed.error.message, { status: 400 });

    const data = await getTrendData(user.id, parsed.data.year, parsed.data.month);
    return Response.json(data);
}

export type GetTrendResponseType = Awaited<ReturnType<typeof getTrendData>>;

async function getTrendData(userId: string, year: number, month: number) {
    // Build 6 monthly slots ending at (year, month) using pure UTC arithmetic —
    // no date-fns timezone-sensitive functions so this works identically on any server TZ.
    const slots = Array.from({ length: 6 }, (_, i) => {
        const offset = 5 - i;
        let m = month - offset;
        let y = year;
        // normalise negative month values
        while (m < 0) { m += 12; y--; }
        const start = new Date(Date.UTC(y, m, 1));
        // last millisecond of the month
        const end = new Date(Date.UTC(y, m + 1, 1) - 1);
        return { month: m, year: y, start, end };
    });

    const transactions = await prisma.transaction.findMany({
        where: {
            userId,
            date: { gte: slots[0].start, lte: slots[slots.length - 1].end },
        },
        select: { type: true, amount: true, date: true, category: true },
    });

    return slots.map((slot) => {
        const txs = transactions.filter(
            (tx) => tx.date >= slot.start && tx.date <= slot.end && tx.category !== "CC Bill Payment"
        );
        const income     = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
        const expense    = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
        const investment = txs.filter((t) => t.type === "investment").reduce((s, t) => s + t.amount, 0);
        const r = (n: number) => Math.round(n * 100) / 100;
        return {
            month: slot.month,
            year: slot.year,
            income:     r(income),
            expense:    r(expense),
            investment: r(investment),
            balance:    r(income - expense - investment),
        };
    });
}
