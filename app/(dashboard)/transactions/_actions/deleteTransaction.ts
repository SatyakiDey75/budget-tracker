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
            },
        });

        if (transaction.bankId && transaction.bankName &&
            !transaction.bankName.toLowerCase().includes("credit card")) {
            await tx.bank.update({
                where: { id: transaction.bankId, userId: user.id },
                data: {
                    balance: {
                        increment: transaction.type === "income" ? -transaction.amount : transaction.amount,
                    },
                },
            });
        }
    });
}
