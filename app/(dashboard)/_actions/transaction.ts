"use server";

import { prisma } from "@/lib/prisma";
import { CreateTransactionSchema, CreateTransactionSchemaType } from "@/schema/transaction";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function CreateTransaction(form: CreateTransactionSchemaType) {
    const parsedBody = CreateTransactionSchema.safeParse(form);
    if (!parsedBody.success) {
        throw new Error("Bad request");
    }

    const user = await currentUser();
    if (!user) {
        redirect("/sign-in");
    }

    const { amount, category, date, description, type, bankId } = parsedBody.data;

    const categoryRow = await prisma.category.findFirst({
        where: {
            userId: user.id,
            name: category,
        },
    });

    if (!categoryRow) {
        throw new Error("Category not found");
    }

    const bankRow = bankId
        ? await prisma.bank.findFirst({ where: { id: bankId, userId: user.id } })
        : null;

    if (bankId && !bankRow) {
        throw new Error("Bank not found");
    }

    await prisma.$transaction(async (tx) => {
        await tx.transaction.create({
            data: {
                userId: user.id,
                amount,
                date,
                description: description || "",
                type,
                category: categoryRow.name,
                categoryIcon: categoryRow.icon,
                bankId: bankRow?.id,
                bankName: bankRow?.bankName,
                accountName: bankRow?.accountName,
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
                expense: type === "expense" ? amount : 0,
                income: type === "income" ? amount : 0,
            },
            update: {
                expense: { increment: type === "expense" ? amount : 0 },
                income: { increment: type === "income" ? amount : 0 },
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
            },
            update: {
                expense: { increment: type === "expense" ? amount : 0 },
                income: { increment: type === "income" ? amount : 0 },
            },
        });

        if (bankRow) {
            await tx.bank.update({
                where: { id: bankRow.id, userId: user.id },
                data: {
                    balance: { increment: type === "income" ? amount : -amount },
                },
            });
        }
    });
}
