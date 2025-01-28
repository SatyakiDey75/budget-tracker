import { PiggyBank } from "lucide-react";
import React from "react";

export default function Logo() {
    return (
        <a href="/" className="flex items-center gap-2">
            <PiggyBank className="stroke h-11 w-11 stroke-amber-500 stroke-[1.5]" />
            <p className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent font-bold text-3xl leading-tight tracking-tighter">Budgeteer</p>
        </a>
    )
}