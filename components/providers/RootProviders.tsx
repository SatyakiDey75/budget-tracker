"use client";

import { ThemeProvider } from "next-themes";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

export default function RootProviders({ children }: { children: React.ReactNode }) {
    
    const [ queryClient ] = React.useState(() => new QueryClient({}));

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider 
                attribute="class"
                // defaultTheme="light"
                enableSystem
                disableTransitionOnChange
            >
                {children}
            </ThemeProvider>
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
}