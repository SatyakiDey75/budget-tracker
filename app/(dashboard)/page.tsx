import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import React from "react";

export default async function page() {
    const user = await currentUser();
    if (!user) {
        redirect("/sign-in");
    }
    return (
        <div>
            <h1>Dashboard</h1>
        </div>
    );
}