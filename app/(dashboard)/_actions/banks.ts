"use server";

import { prisma } from "@/lib/prisma";
import {
    CreateBankSchema, CreateBankSchemaType,
    UpdateBankSchema, UpdateBankSchemaType,
    CreateCardSchema, CreateCardSchemaType,
    UpdateCardSchema, UpdateCardSchemaType,
} from "@/schema/banks";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function CreateBank(form: CreateBankSchemaType) {
    const parsedBody = CreateBankSchema.safeParse(form);
    if (!parsedBody.success) {
        throw new Error("Bad request");
    }

    const user = await currentUser();
    if (!user) {
        redirect("/sign-in");
    }

    const { bankName, branch, accountName, balance } = parsedBody.data;

    return prisma.bank.create({
        data: {
            userId: user.id,
            bankName,
            branch,
            accountName,
            balance,
        },
    });
}

export async function UpdateBank(form: UpdateBankSchemaType) {
    const parsedBody = UpdateBankSchema.safeParse(form);
    if (!parsedBody.success) {
        throw new Error("Bad request");
    }

    const user = await currentUser();
    if (!user) {
        redirect("/sign-in");
    }

    const { id, branch, accountName, balance } = parsedBody.data;

    return prisma.bank.update({
        where: { id, userId: user.id },
        data: { branch, accountName, balance },
    });
}

export async function CreateCard(form: CreateCardSchemaType) {
    const parsedBody = CreateCardSchema.safeParse(form);
    if (!parsedBody.success) throw new Error("Bad request");

    const user = await currentUser();
    if (!user) redirect("/sign-in");

    const { bankName, accountName, limit } = parsedBody.data;

    return prisma.bank.create({
        data: {
            userId: user.id,
            bankName,
            branch: "",
            accountName,
            balance: limit,
            isCredit: true,
            limit,
        },
    });
}

export async function DeleteBank(id: string) {
    const user = await currentUser();
    if (!user) redirect("/sign-in");

    return prisma.bank.delete({ where: { id, userId: user.id } });
}

export async function UpdateCard(form: UpdateCardSchemaType) {
    const parsedBody = UpdateCardSchema.safeParse(form);
    if (!parsedBody.success) throw new Error("Bad request");

    const user = await currentUser();
    if (!user) redirect("/sign-in");

    const { id, accountName, balance, limit } = parsedBody.data;

    return prisma.bank.update({
        where: { id, userId: user.id },
        data: { accountName, balance, limit },
    });
}
