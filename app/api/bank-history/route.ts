import { prisma } from "@/lib/prisma";
import { Period, TimeFrame } from "@/lib/types";
import { currentUser } from "@clerk/nextjs/server";
import { getDaysInMonth } from "date-fns";
import { redirect } from "next/navigation";
import { z } from "zod";

const schema = z.object({
    timeFrame: z.enum(["month", "year"]),
    month: z.coerce.number().min(0).max(11).default(0),
    year: z.coerce.number().min(1947).max(3000),
});

export async function GET(request: Request) {
    const user = await currentUser();
    if (!user) redirect("/sign-in");

    const { searchParams } = new URL(request.url);
    const parsed = schema.safeParse({
        timeFrame: searchParams.get("timeFrame"),
        year: searchParams.get("year"),
        month: searchParams.get("month"),
    });

    if (!parsed.success) {
        return Response.json(parsed.error.message, { status: 400 });
    }

    const data = await getBankHistoryData(user.id, parsed.data.timeFrame, {
        month: parsed.data.month,
        year: parsed.data.year,
    });

    return Response.json(data);
}

export type GetBankHistoryResponseType = Awaited<ReturnType<typeof getBankHistoryData>>;

async function getBankHistoryData(userId: string, timeFrame: TimeFrame, period: Period) {
    const banks = await prisma.bank.findMany({
        where: { userId },
        orderBy: { bankName: "asc" },
    });

    if (banks.length === 0) return { data: [], banks: [] };

    const bankIds = banks.map((b) => b.id);

    // Fetch every bank-linked transaction ever — needed to reconstruct balance history
    const allTransactions = await prisma.transaction.findMany({
        where: {
            userId,
            bankId: { in: bankIds },
        },
        select: { bankId: true, date: true, amount: true, type: true },
        orderBy: { date: "asc" },
    });

    // For each bank: initialBalance = currentBalance - totalIncome + totalExpense
    const bankData = banks.map((bank) => {
        const txs = allTransactions.filter((t) => t.bankId === bank.id);
        const netFromTxs = txs.reduce(
            (sum, t) => (t.type === "income" ? sum + t.amount : sum - t.amount),
            0
        );
        return { ...bank, initialBalance: bank.balance - netFromTxs, transactions: txs };
    });

    const slots: Record<string, number | string>[] = [];

    if (timeFrame === "year") {
        for (let m = 0; m < 12; m++) {
            // Balance at end of month m (last ms of the last day)
            const slotEnd = new Date(Date.UTC(period.year, m + 1, 0, 23, 59, 59, 999));
            const slot: Record<string, number | string> = { year: period.year, month: m, total: 0 };
            let total = 0;

            for (const bank of bankData) {
                const net = bank.transactions
                    .filter((t) => new Date(t.date) <= slotEnd)
                    .reduce((s, t) => (t.type === "income" ? s + t.amount : s - t.amount), 0);
                const balance = round(bank.initialBalance + net);
                slot[bank.id] = balance;
                total += balance;
            }

            slot.total = round(total);
            slots.push(slot);
        }
    } else {
        const daysInMonth = getDaysInMonth(new Date(period.year, period.month));
        for (let d = 1; d <= daysInMonth; d++) {
            const slotEnd = new Date(Date.UTC(period.year, period.month, d, 23, 59, 59, 999));
            const slot: Record<string, number | string> = {
                year: period.year,
                month: period.month,
                day: d,
                total: 0,
            };
            let total = 0;

            for (const bank of bankData) {
                const net = bank.transactions
                    .filter((t) => new Date(t.date) <= slotEnd)
                    .reduce((s, t) => (t.type === "income" ? s + t.amount : s - t.amount), 0);
                const balance = round(bank.initialBalance + net);
                slot[bank.id] = balance;
                total += balance;
            }

            slot.total = round(total);
            slots.push(slot);
        }
    }

    return {
        data: slots,
        banks: banks.map((b) => ({ id: b.id, bankName: b.bankName, accountName: b.accountName })),
    };
}

function round(n: number) {
    return Math.round(n * 100) / 100;
}
