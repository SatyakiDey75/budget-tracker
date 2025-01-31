import React from "react";

export default function layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative flex h-screen flex-col w-full items-center justify-center">
            { children }
        </div>
    );
}