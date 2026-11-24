"use server";

import { prisma } from "@/lib/prisma";
import { CreateTransferSchema, CreateTransferSchemaType } from "@/schema/banks";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function CreateTransfer(form: CreateTransferSchemaType) {
    const parsedBody = CreateTransferSchema.safeParse(form);
    if (!parsedBody.success) throw new Error("Bad request");

    const user = await currentUser();
    if (!user) redirect("/sign-in");

    const { sourceBankId, destBankId, amount, date } = parsedBody.data;

    if (sourceBankId === destBankId) throw new Error("Source and destination cannot be the same");

    const [source, dest] = await Promise.all([
        prisma.bank.findFirst({ where: { id: sourceBankId, userId: user.id } }),
        prisma.bank.findFirst({ where: { id: destBankId, userId: user.id } }),
    ]);

    if (!source) throw new Error("Source bank not found");
    if (!dest) throw new Error("Destination bank not found");

    const description = `${source.bankName} – ${source.accountName} to ${dest.bankName} – ${dest.accountName}`;

    await prisma.$transaction(async (tx) => {
        await tx.bank.update({
            where: { id: source.id, userId: user.id },
            data: { balance: { increment: -amount } },
        });

        await tx.bank.update({
            where: { id: dest.id, userId: user.id },
            data: { balance: { increment: amount } },
        });

        await tx.transaction.create({
            data: {
                userId: user.id,
                amount,
                date,
                description,
                type: "transfer",
                category: "Transfer",
                categoryIcon: "⇄",
                bankId: source.id,
                bankName: source.bankName,
                accountName: source.accountName,
                merchantName: dest.id, // stored so delete can reverse destination balance
            },
        });
        // No MonthHistory/YearHistory — transfers are not income/expense

        await (tx as any).bankDayHistory.upsert({
            where: { userId_bankId_day_month_year: { userId: user.id, bankId: source.id, day: date.getUTCDate(), month: date.getUTCMonth(), year: date.getUTCFullYear() } },
            create: { userId: user.id, bankId: source.id, day: date.getUTCDate(), month: date.getUTCMonth(), year: date.getUTCFullYear(), netChange: -amount },
            update: { netChange: { increment: -amount } },
        });

        await (tx as any).bankDayHistory.upsert({
            where: { userId_bankId_day_month_year: { userId: user.id, bankId: dest.id, day: date.getUTCDate(), month: date.getUTCMonth(), year: date.getUTCFullYear() } },
            create: { userId: user.id, bankId: dest.id, day: date.getUTCDate(), month: date.getUTCMonth(), year: date.getUTCFullYear(), netChange: amount },
            update: { netChange: { increment: amount } },
        });
    });
}
