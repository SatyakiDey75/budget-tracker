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

    // Auto-seed BankDayHistory from raw transactions if this is the first time
    const historyCount = await (prisma as any).bankDayHistory.count({ where: { userId } });
    if (historyCount === 0) {
        const txCount = await prisma.transaction.count({ where: { userId, bankId: { in: bankIds } } });
        if (txCount > 0) await seedBankDayHistory(userId, banks);
    }

    const allHistory: { bankId: string; day: number; month: number; year: number; netChange: number }[] =
        await (prisma as any).bankDayHistory.findMany({
            where: { userId, bankId: { in: bankIds } },
            select: { bankId: true, day: true, month: true, year: true, netChange: true },
        });

    const bankData = banks.map((bank) => {
        const history = allHistory.filter((h) => h.bankId === bank.id);
        const totalNet = history.reduce((s, h) => s + h.netChange, 0);
        return { ...bank, initialBalance: bank.balance - totalNet, history };
    });

    const slots: Record<string, number | string>[] = [];

    if (timeFrame === "year") {
        for (let m = 0; m < 12; m++) {
            const slotEnd = new Date(Date.UTC(period.year, m + 1, 0, 23, 59, 59, 999));
            const slot: Record<string, number | string> = { year: period.year, month: m, total: 0 };
            let total = 0;

            for (const bank of bankData) {
                if (slotEnd < new Date(bank.createdAt)) {
                    // bank didn't exist yet — omit the data point so Recharts renders a gap
                    continue;
                }
                const net = bank.history
                    .filter((h) => new Date(Date.UTC(h.year, h.month, h.day)) <= slotEnd)
                    .reduce((s, h) => s + h.netChange, 0);
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
                if (slotEnd < new Date(bank.createdAt)) {
                    // bank didn't exist yet — omit the data point so Recharts renders a gap
                    continue;
                }
                const net = bank.history
                    .filter((h) => new Date(Date.UTC(h.year, h.month, h.day)) <= slotEnd)
                    .reduce((s, h) => s + h.netChange, 0);
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

// One-time seeding: builds BankDayHistory from all existing transactions.
async function seedBankDayHistory(userId: string, banks: { id: string }[]) {
    const bankIds = banks.map((b) => b.id);

    const transactions = await prisma.transaction.findMany({
        where: { userId, bankId: { in: bankIds } },
        select: { bankId: true, date: true, amount: true, type: true },
    });

    const dayChanges = new Map<string, { bankId: string; day: number; month: number; year: number; netChange: number }>();

    for (const tx of transactions) {
        if (!tx.bankId) continue;
        const d = new Date(tx.date);
        const key = `${tx.bankId}|${d.getUTCDate()}|${d.getUTCMonth()}|${d.getUTCFullYear()}`;
        const change = tx.type === "income" ? tx.amount : -tx.amount;

        if (dayChanges.has(key)) {
            dayChanges.get(key)!.netChange += change;
        } else {
            dayChanges.set(key, {
                bankId: tx.bankId,
                day: d.getUTCDate(),
                month: d.getUTCMonth(),
                year: d.getUTCFullYear(),
                netChange: change,
            });
        }
    }

    for (const rec of Array.from(dayChanges.values())) {
        await (prisma as any).bankDayHistory.upsert({
            where: { userId_bankId_day_month_year: { userId, bankId: rec.bankId, day: rec.day, month: rec.month, year: rec.year } },
            create: { userId, bankId: rec.bankId, day: rec.day, month: rec.month, year: rec.year, netChange: rec.netChange },
            update: { netChange: rec.netChange },
        });
    }
}

function round(n: number) {
    return Math.round(n * 100) / 100;
}
