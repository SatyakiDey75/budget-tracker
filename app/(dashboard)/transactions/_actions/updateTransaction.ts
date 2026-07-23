"use server";

import { prisma } from "@/lib/prisma";
import { UpdateTransactionSchema, UpdateTransactionSchemaType } from "@/schema/transaction";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function UpdateTransaction(form: UpdateTransactionSchemaType) {
    const parsedBody = UpdateTransactionSchema.safeParse(form);
    if (!parsedBody.success) throw new Error("Bad request");

    const user = await currentUser();
    if (!user) redirect("/sign-in");

    const { transactionId, amount, category, date, description, type, bankId, merchantName, investmentApp } =
        parsedBody.data;

    const oldTransaction = await prisma.transaction.findFirst({
        where: { id: transactionId, userId: user.id },
    });
    if (!oldTransaction) throw new Error("Transaction not found");

    // For income/expense we need a category row; investment uses app name directly
    const categoryRow = type !== "investment"
        ? await prisma.category.findFirst({ where: { userId: user.id, name: category } })
        : null;
    if (type !== "investment" && !categoryRow) throw new Error("Category not found");

    const newBankRow = bankId
        ? await prisma.bank.findFirst({ where: { id: bankId, userId: user.id } })
        : null;
    if (bankId && !newBankRow) throw new Error("Bank not found");

    const oldBankRow = oldTransaction.bankId
        ? await prisma.bank.findFirst({ where: { id: oldTransaction.bankId, userId: user.id } })
        : null;

    await prisma.$transaction(async (tx) => {
        // 1. Update the transaction record
        await (tx.transaction as any).update({
            where: { id: transactionId, userId: user.id },
            data: {
                amount,
                date,
                description: description || "",
                type,
                category: type === "investment" ? ("Investment") : categoryRow!.name,
                categoryIcon: type === "investment" ? "📈" : categoryRow!.icon,
                bankId: newBankRow?.id ?? null,
                bankName: newBankRow?.bankName ?? null,
                accountName: newBankRow?.accountName ?? null,
                merchantName: type === "investment" ? (investmentApp || null) : type === "expense" ? (merchantName || null) : null,
                investmentApp: type === "investment" ? (investmentApp || null) : null,
            },
        });

        // 2. Reverse old month/year history
        await tx.monthHistory.updateMany({
            where: {
                userId: user.id,
                day: oldTransaction.date.getUTCDate(),
                month: oldTransaction.date.getUTCMonth(),
                year: oldTransaction.date.getUTCFullYear(),
            },
            data: {
                expense: { decrement: oldTransaction.type === "expense" ? oldTransaction.amount : 0 },
                income: { decrement: oldTransaction.type === "income" ? oldTransaction.amount : 0 },
                investment: { decrement: oldTransaction.type === "investment" ? oldTransaction.amount : 0 },
            },
        });

        await tx.yearHistory.updateMany({
            where: {
                userId: user.id,
                month: oldTransaction.date.getUTCMonth(),
                year: oldTransaction.date.getUTCFullYear(),
            },
            data: {
                expense: { decrement: oldTransaction.type === "expense" ? oldTransaction.amount : 0 },
                income: { decrement: oldTransaction.type === "income" ? oldTransaction.amount : 0 },
                investment: { decrement: oldTransaction.type === "investment" ? oldTransaction.amount : 0 },
            },
        });

        // 3. Apply new month/year history
        await tx.monthHistory.upsert({
            where: {
                day_month_year_userId: {
                    userId: user.id,
                    day: date.getUTCDate(),
                    month: date.getUTCMonth(),
                    year: date.getUTCFullYear(),
                },
            },
            create: {
                userId: user.id,
                day: date.getUTCDate(),
                month: date.getUTCMonth(),
                year: date.getUTCFullYear(),
                expense: type === "expense" ? amount : 0,
                income: type === "income" ? amount : 0,
                investment: type === "investment" ? amount : 0,
            },
            update: {
                expense: { increment: type === "expense" ? amount : 0 },
                income: { increment: type === "income" ? amount : 0 },
                investment: { increment: type === "investment" ? amount : 0 },
            },
        });

        await tx.yearHistory.upsert({
            where: {
                month_year_userId: {
                    userId: user.id,
                    month: date.getUTCMonth(),
                    year: date.getUTCFullYear(),
                },
            },
            create: {
                userId: user.id,
                month: date.getUTCMonth(),
                year: date.getUTCFullYear(),
                expense: type === "expense" ? amount : 0,
                income: type === "income" ? amount : 0,
                investment: type === "investment" ? amount : 0,
            },
            update: {
                expense: { increment: type === "expense" ? amount : 0 },
                income: { increment: type === "income" ? amount : 0 },
                investment: { increment: type === "investment" ? amount : 0 },
            },
        });

        // 4. Reverse old bank balance (investment deducts like expense)
        if (oldBankRow) {
            await applyBankBalance(tx, user.id, oldBankRow, {
                increment: oldTransaction.type === "income" ? -oldTransaction.amount : oldTransaction.amount,
            });
        }

        // 5. Apply new bank balance
        if (newBankRow) {
            await applyBankBalance(tx, user.id, newBankRow, {
                increment: type === "income" ? amount : -amount,
            });
        }
    });
}

async function applyBankBalance(
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    userId: string,
    bankRow: { id: string; bankName: string },
    data: { increment: number }
) {
    const isCredit = bankRow.bankName.toLowerCase().includes("credit card");
    if (isCredit) {
        const prefix = bankRow.bankName.replace(/\s*credit\s*card.*$/i, "").trim();
        if (!prefix) return;
        const allBanks = await tx.bank.findMany({ where: { userId } });
        const parentBank = allBanks.find(
            (b) =>
                !b.bankName.toLowerCase().includes("credit card") &&
                b.bankName.toLowerCase().includes(prefix.toLowerCase())
        );
        if (parentBank) {
            await tx.bank.update({
                where: { id: parentBank.id, userId },
                data: { balance: data },
            });
        }
    } else {
        await tx.bank.update({
            where: { id: bankRow.id, userId },
            data: { balance: data },
        });
    }
}
