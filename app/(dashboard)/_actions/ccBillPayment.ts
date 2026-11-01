"use server";

import { prisma } from "@/lib/prisma";
import { CreateCCBillPaymentSchema, CreateCCBillPaymentSchemaType } from "@/schema/banks";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function CreateCCBillPayment(form: CreateCCBillPaymentSchemaType) {
    const parsedBody = CreateCCBillPaymentSchema.safeParse(form);
    if (!parsedBody.success) throw new Error("Bad request");

    const user = await currentUser();
    if (!user) redirect("/sign-in");

    const { creditCardId, bankId, amount, date } = parsedBody.data;

    const [cc, bank] = await Promise.all([
        prisma.bank.findFirst({ where: { id: creditCardId, userId: user.id, isCredit: true } }),
        prisma.bank.findFirst({ where: { id: bankId, userId: user.id } }),
    ]);

    if (!cc) throw new Error("Credit card not found");
    if (!bank) throw new Error("Bank not found");

    const description = `CC Bill Payment (${bank.bankName} – ${bank.accountName} to ${cc.accountName})`;

    await prisma.$transaction(async (tx) => {
        // Restore CC available credit
        await tx.bank.update({
            where: { id: cc.id, userId: user.id },
            data: { balance: { increment: amount } },
        });

        // Deduct from sending bank
        await tx.bank.update({
            where: { id: bank.id, userId: user.id },
            data: { balance: { increment: -amount } },
        });

        // Create transfer transaction record (isTransfer=true so overview excludes it)
        await tx.transaction.create({
            data: {
                userId: user.id,
                amount,
                date,
                description,
                type: "expense",
                category: "CC Bill Payment",
                categoryIcon: "💳",
                bankId: bank.id,
                bankName: bank.bankName,
                accountName: bank.accountName,
            },
        });
        // No MonthHistory/YearHistory update — transfers are not expenses

        // BankDayHistory for sending bank (-amount)
        await (tx as any).bankDayHistory.upsert({
            where: { userId_bankId_day_month_year: { userId: user.id, bankId: bank.id, day: date.getUTCDate(), month: date.getUTCMonth(), year: date.getUTCFullYear() } },
            create: { userId: user.id, bankId: bank.id, day: date.getUTCDate(), month: date.getUTCMonth(), year: date.getUTCFullYear(), netChange: -amount },
            update: { netChange: { increment: -amount } },
        });

        // BankDayHistory for CC (+amount = more available credit)
        await (tx as any).bankDayHistory.upsert({
            where: { userId_bankId_day_month_year: { userId: user.id, bankId: cc.id, day: date.getUTCDate(), month: date.getUTCMonth(), year: date.getUTCFullYear() } },
            create: { userId: user.id, bankId: cc.id, day: date.getUTCDate(), month: date.getUTCMonth(), year: date.getUTCFullYear(), netChange: amount },
            update: { netChange: { increment: amount } },
        });
    });
}
