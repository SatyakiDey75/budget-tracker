import Navbar from "@/components/Navbar";
import React from "react";

export default function layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative flex h-screen flex-col w-full">
            <Navbar />
            <div className="w-full">{ children }</div>
        </div>
    );
}