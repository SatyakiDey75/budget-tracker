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
        throw new Error(queryParams.error.message);
    }

    const stats = await getCategoryStats(
        user.id,
        queryParams.data.from,
        queryParams.data.to
    );

    return Response.json(stats);
}

export type GetCategoryStatsResponseType = Awaited<ReturnType<typeof getCategoryStats>>;

async function getCategoryStats(userId: string, from: Date, to: Date) {
    const transactions = await prisma.transaction.findMany({
        where: {
            userId,
            date: { gte: from, lte: to },
        },
        select: { type: true, category: true, categoryIcon: true, amount: true },
    });

    const buckets = new Map<string, { type: string; category: string; categoryIcon: string; _sum: { amount: number } }>();
    for (const t of transactions) {
        if (t.category === "CC Bill Payment") continue;
        const key = `${t.type}||${t.category}||${t.categoryIcon}`;
        if (!buckets.has(key)) {
            buckets.set(key, { type: t.type, category: t.category, categoryIcon: t.categoryIcon, _sum: { amount: 0 } });
        }
        buckets.get(key)!._sum.amount += t.amount;
    }

    return Array.from(buckets.values()).sort((a, b) => b._sum.amount - a._sum.amount);
}