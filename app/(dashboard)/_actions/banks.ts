"use server";

import { prisma } from "@/lib/prisma";
import { CreateBankSchema, CreateBankSchemaType, UpdateBankSchema, UpdateBankSchemaType } from "@/schema/banks";
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
