import { prisma } from "@/lib/prisma";
import { OverviewQuerySchema } from "@/schema/overview";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function GET(request: Request) {
    const user = await currentUser();
    if (!user) redirect("/sign-in");

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const queryParams = OverviewQuerySchema.safeParse({ from, to });
    if (!queryParams.success) throw new Error(queryParams.error.message);

    const stats = await getMerchantStats(user.id, queryParams.data.from, queryParams.data.to);
    return Response.json(stats);
}

export type GetMerchantStatsResponseType = Awaited<ReturnType<typeof getMerchantStats>>;

async function getMerchantStats(userId: string, from: Date, to: Date) {
    interface TxRow { merchantName: string | null; amount: number; categoryIcon: string }

    const txns = (await (prisma.transaction as any).findMany({
        where: {
            userId,
            type: "expense",
            merchantName: { not: null },
            date: { gte: from, lte: to },
        },
        select: { merchantName: true, amount: true, categoryIcon: true },
    })) as TxRow[];

    const map = new Map<string, { amount: number; count: number; icon: string }>();
    for (const t of txns) {
        if (!t.merchantName) continue;
        const existing = map.get(t.merchantName);
        if (existing) {
            existing.amount += t.amount;
            existing.count += 1;
        } else {
            map.set(t.merchantName, { amount: t.amount, count: 1, icon: t.categoryIcon });
        }
    }

    return Array.from(map.entries())
        .map(([name, d]) => ({ name, amount: d.amount, count: d.count, icon: d.icon }))
        .sort((a, b) => b.amount - a.amount);
}
