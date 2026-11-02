import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { redirect } from "next/navigation";
import { z } from "zod";

const schema = z.object({ from: z.coerce.date() });

export async function GET(request: Request) {
    const user = await currentUser();
    if (!user) redirect("/sign-in");

    const { searchParams } = new URL(request.url);
    const parsed = schema.safeParse({ from: searchParams.get("from") });
    if (!parsed.success) return Response.json(parsed.error.message, { status: 400 });

    const data = await getTrendData(user.id, parsed.data.from);
    return Response.json(data);
}

export type GetTrendResponseType = Awaited<ReturnType<typeof getTrendData>>;

async function getTrendData(userId: string, from: Date) {
    // 6 slots ending at the month of `from` — using same startOfMonth/endOfMonth
    // as the balance API so boundaries are identical
    const slots = Array.from({ length: 6 }, (_, i) => {
        const base = subMonths(from, 5 - i);
        return {
            month: base.getMonth(),
            year: base.getFullYear(),
            start: startOfMonth(base),
            end: endOfMonth(base),
        };
    });

    const transactions = await prisma.transaction.findMany({
        where: {
            userId,
            date: { gte: slots[0].start, lte: slots[slots.length - 1].end },
        },
        select: { type: true, amount: true, date: true, category: true },
    });

    return slots.map((slot) => {
        const txs = transactions.filter((tx) => tx.date >= slot.start && tx.date <= slot.end && tx.category !== "CC Bill Payment");
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
