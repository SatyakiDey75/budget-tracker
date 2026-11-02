"use server";

import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function DeleteTransaction(id: string) {
    const user = await currentUser();
    if (!user) {
        redirect("/sign-in");
    }

    const transaction = await prisma.transaction.findUnique({
        where: { userId: user.id, id },
    });

    if (!transaction) {
        throw new Error("Transaction not found");
    }

    const isTransfer = transaction.category === "CC Bill Payment";
    const d = transaction.date;
    const day = d.getUTCDate();
    const month = d.getUTCMonth();
    const year = d.getUTCFullYear();

    await prisma.$transaction(async (tx) => {
        await tx.transaction.delete({ where: { id, userId: user.id } });

        // MonthHistory / YearHistory — transfers were never counted, skip them
        if (!isTransfer) {
            await tx.monthHistory.update({
                where: { day_month_year_userId: { userId: user.id, day, month, year } },
                data: {
                    ...(transaction.type === "expense"    && { expense:    { decrement: transaction.amount } }),
                    ...(transaction.type === "income"     && { income:     { decrement: transaction.amount } }),
                    ...(transaction.type === "investment" && { investment: { decrement: transaction.amount } }),
                },
            });

            await tx.yearHistory.update({
                where: { month_year_userId: { userId: user.id, month, year } },
                data: {
                    ...(transaction.type === "expense"    && { expense:    { decrement: transaction.amount } }),
                    ...(transaction.type === "income"     && { income:     { decrement: transaction.amount } }),
                    ...(transaction.type === "investment" && { investment: { decrement: transaction.amount } }),
                },
            });
        }

        // Bank balance reversal
        // income    → bank had +amount applied → now subtract
        // expense   → bank had -amount applied → now add back
        // investment→ bank had -amount applied → now add back (same as expense)
        // transfer  → source bank had -amount  → now add back (CC bank handled separately below)
        if (transaction.bankId) {
            const bankDelta = transaction.type === "income" ? -transaction.amount : transaction.amount;

            await tx.bank.update({
                where: { id: transaction.bankId, userId: user.id },
                data: { balance: { increment: bankDelta } },
            });

            await (tx as any).bankDayHistory.upsert({
                where: { userId_bankId_day_month_year: { userId: user.id, bankId: transaction.bankId, day, month, year } },
                create: { userId: user.id, bankId: transaction.bankId, day, month, year, netChange: bankDelta },
                update: { netChange: { increment: bankDelta } },
            });
        }

        // Transfer: also reverse the CC bank (merchantName holds the CC bank id)
        if (isTransfer && transaction.merchantName) {
            const ccId = transaction.merchantName;

            // CC had +amount applied (available credit restored) → now subtract it back
            await tx.bank.update({
                where: { id: ccId, userId: user.id },
                data: { balance: { increment: -transaction.amount } },
            });

            await (tx as any).bankDayHistory.upsert({
                where: { userId_bankId_day_month_year: { userId: user.id, bankId: ccId, day, month, year } },
                create: { userId: user.id, bankId: ccId, day, month, year, netChange: -transaction.amount },
                update: { netChange: { increment: -transaction.amount } },
            });
        }
    });
}
