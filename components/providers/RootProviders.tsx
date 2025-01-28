"use client";

import { ThemeProvider } from "next-themes";
import React from "react";

export default function RootProviders({ children }: { children: React.ReactNode }) {
    return <ThemeProvider 
                attribute="class"
                // defaultTheme="light"
                enableSystem
                disableTransitionOnChange
            >
                {children}
            </ThemeProvider>;
}