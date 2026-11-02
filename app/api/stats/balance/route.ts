import { prisma } from "@/lib/prisma";
import { OverviewQuerySchema } from "@/schema/overview";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function GET(request: Request) {
    const user = await currentUser();
    if (!user) {
        redirect('/sign-in');
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const queryParams = OverviewQuerySchema.safeParse({ from, to });

    if (!queryParams.success) {
        return Response.json(queryParams.error.message, { status: 400 });
    }

    const stats = await getBalancedStats(
        user.id,
        queryParams.data.from,
        queryParams.data.to
    );

    return Response.json(stats);
}

export type GetBalancedStatsResponseType = Awaited<ReturnType<typeof getBalancedStats>>;

async function getBalancedStats(userId: string, from: Date, to: Date) {
    const transactions = await prisma.transaction.findMany({
        where: {
            userId,
            date: { gte: from, lte: to },
        },
        select: { type: true, amount: true, category: true },
    });

    let income = 0, expense = 0, investment = 0;
    for (const t of transactions) {
        if (t.category === "CC Bill Payment") continue;
        if (t.type === "income")     income     += t.amount;
        if (t.type === "expense")    expense    += t.amount;
        if (t.type === "investment") investment += t.amount;
    }

    return {
        income:     Math.round(income     * 100) / 100,
        expense:    Math.round(expense    * 100) / 100,
        investment: Math.round(investment * 100) / 100,
    };
}