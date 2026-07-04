import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function GET() {
    const user = await currentUser();
    if (!user) {
        redirect("/sign-in");
    }

    const banks = await prisma.bank.findMany({
        where: { userId: user.id },
        orderBy: { bankName: "asc" },
    });

    return Response.json(banks);
}
