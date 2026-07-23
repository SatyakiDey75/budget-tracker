"use server";

import { prisma } from "@/lib/prisma";
import { CreateInvestmentSchema, CreateInvestmentSchemaType } from "@/schema/transaction";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function CreateInvestment(form: CreateInvestmentSchemaType) {
    const parsedBody = CreateInvestmentSchema.safeParse(form);
    if (!parsedBody.success) throw new Error("Bad request");

    const user = await currentUser();
    if (!user) redirect("/sign-in");

    const { amount, date, description, bankId, investmentApp } = parsedBody.data;

    const bankRow = bankId
        ? await prisma.bank.findFirst({ where: { id: bankId, userId: user.id } })
        : null;
    if (bankId && !bankRow) throw new Error("Bank not found");

    await prisma.$transaction(async (tx) => {
        await (tx.transaction as any).create({
            data: {
                userId: user.id,
                amount,
                date,
                description: description || "",
                type: "investment",
                category: "Investment",
                categoryIcon: "📈",
                bankId: bankRow?.id ?? null,
                bankName: bankRow?.bankName ?? null,
                accountName: bankRow?.accountName ?? null,
                investmentApp: investmentApp || null,
                merchantName: investmentApp || null,
            },
        });

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
                expense: 0,
                income: 0,
                investment: amount,
            },
            update: {
                investment: { increment: amount },
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
                expense: 0,
                income: 0,
                investment: amount,
            },
            update: {
                investment: { increment: amount },
            },
        });

        if (bankRow) {
            const isCredit = bankRow.bankName.toLowerCase().includes("credit card");
            if (isCredit) {
                const prefix = bankRow.bankName.replace(/\s*credit\s*card.*$/i, "").trim();
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
                            data: { balance: { increment: -amount } },
                        });
                    }
                }
            } else {
                await tx.bank.update({
                    where: { id: bankRow.id, userId: user.id },
                    data: { balance: { increment: -amount } },
                });
            }
        }
    });
}
