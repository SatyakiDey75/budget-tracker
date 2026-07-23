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
        where: {
            userId: user.id,
            id,
        },
    });

    if (!transaction) {
        throw new Error("Transaction not found");
    }

    await prisma.$transaction(async (tx) => {
        await tx.transaction.delete({
            where: { id, userId: user.id },
        });

        await tx.monthHistory.update({
            where: {
                day_month_year_userId: {
                    userId: user.id,
                    day: transaction.date.getUTCDate(),
                    month: transaction.date.getUTCMonth(),
                    year: transaction.date.getUTCFullYear(),
                },
            },
            data: {
                ...(transaction.type === "expense" && { expense: { decrement: transaction.amount } }),
                ...(transaction.type === "income" && { income: { decrement: transaction.amount } }),
                ...(transaction.type === "investment" && { investment: { decrement: transaction.amount } }),
            },
        });

        await tx.yearHistory.update({
            where: {
                month_year_userId: {
                    userId: user.id,
                    month: transaction.date.getUTCMonth(),
                    year: transaction.date.getUTCFullYear(),
                },
            },
            data: {
                ...(transaction.type === "expense" && { expense: { decrement: transaction.amount } }),
                ...(transaction.type === "income" && { income: { decrement: transaction.amount } }),
                ...(transaction.type === "investment" && { investment: { decrement: transaction.amount } }),
            },
        });

        if (transaction.bankId && transaction.bankName) {
            const isCredit = transaction.bankName.toLowerCase().includes("credit card");
            if (isCredit) {
                const prefix = transaction.bankName.replace(/\s*credit\s*card.*$/i, "").trim();
                if (prefix) {
                    const allBanks = await tx.bank.findMany({ where: { userId: user.id } });
                    const parentBank = allBanks.find(
                        (b) =>
                            !b.bankName.toLowerCase().includes("credit card") &&
                            b.bankName.toLowerCase().includes(prefix.toLowerCase())
                    );
                    if (parentBank) {
                        await tx.bank.update({
                            where: { id: parentBank.id, userId: user.id },
                            data: {
                                balance: {
                                    increment: transaction.type === "income" ? -transaction.amount : transaction.amount,
                                },
                            },
                        });
                    }
                }
            } else {
                await tx.bank.update({
                    where: { id: transaction.bankId, userId: user.id },
                    data: {
                        balance: {
                            increment: transaction.type === "income" ? -transaction.amount : transaction.amount,
                        },
                    },
                });
            }
        }
    });
}
