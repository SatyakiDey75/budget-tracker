"use client";

import { CurrencyComboBox } from "@/components/CurrencyComboBox";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionType } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { PlusSquare, TrashIcon, TrendingDown, TrendingUp } from "lucide-react";
import React from "react";
import CreateCategoryDialog from "../_components/CreateCategoryDialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Category } from "@prisma/client";
import DeleteCategoryDialog from "../_components/DeleteCategoryDialog";

export default function page() {
    return (
        <>
            <div className="border-b bg-card p-8">
                <div className="container flex flex-col items-start justify-between gap-2">
                    <p className="text-3xl font-bold">Manage</p>
                    <p className="text-muted-foreground">
                        Manage your account settings and categories
                    </p>
                </div>
            </div>

            <div className="container flex flex-col gap-4 p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Currency</CardTitle>
                        <CardDescription>Set your default currency for transactions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CurrencyComboBox />
                    </CardContent>
                </Card>
                <CategoryList type="income" />
                <CategoryList type="expense" />
            </div>
        </>
    );
}

function CategoryList({ type }: { type: TransactionType }) {
    const categoriesQuery = useQuery({
        queryKey: ["categories", type],
        queryFn: () => fetch(`/api/categories?type=${type}`).then((res) => res.json()),
    });

    const dataAvailable = categoriesQuery.data && categoriesQuery.data.length > 0;

    return (
        <SkeletonWrapper isLoading={categoriesQuery.isLoading}>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            {type === "income" ? (
                                <TrendingUp className="h-12 w-12 items-center rounded-lg bg-emerald-400/10 p-2 text-emerald-500" />
                            ) : (
                                <TrendingDown className="h-12 w-12 items-center rounded-lg bg-rose-400/10 p-2 text-rose-500" />
                            )}
                            
                            <div className="ml-2">
                                {type === "income" ? "Income" : "Expense"} categories
                                <div className="text-sm font-normal text-muted-foreground">
                                    Sorted by name
                                </div>
                            </div>
                        </div>
                        <CreateCategoryDialog 
                            type={type} 
                            successCallback={() => categoriesQuery.refetch}
                            trigger={
                                <Button className="gap-2 text-sm">
                                    <PlusSquare className="h-4 w-4" />
                                    Create Category
                                </Button>
                            }    
                        />
                    </CardTitle>
                </CardHeader>

                <Separator />

                { !dataAvailable && (
                        <div className="flex h-40 w-full items-center flex-col justify-center">
                            <p>
                                No <span className={cn(
                                    "m-1",
                                    type === "income" ? "text-emerald-500" : "text-rose-500"
                                )}>{type}</span>
                                categories yet
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Create one to get started
                            </p>
                        </div>
                )}

                { dataAvailable && (
                    <div className="grid grid-flow-row gap-4 p-6 sm:grid-flow-row sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        { categoriesQuery.data.map((category: Category) => (
                            <CategoryCard category={category} key={category.name} />
                        ))}
                    </div>
                )}
            </Card>
        </SkeletonWrapper>
    )
}

function CategoryCard({ category }: { category: Category }) {
    return (
        <div className="flex border-separate flex-col justify-between rounded-md border shadow-md shadow-black/[0.1] dark:shadow-white[0.1]">
            <div className="flex flex-col items-center gap-2 p-4">
                <span className="text-3xl" role="image">{category.icon}</span>
                <span>{category.name}</span>
            </div>
            <DeleteCategoryDialog 
                category={category} 
                trigger={
                    <Button 
                        className="flex w-full border-separate items-center gap-2 rounded-t-none text-muted-foreground hover:bg-rose-500/20" variant={"secondary"}
                    >
                        <TrashIcon className="h-4 w-4" />
                        Remove
                    </Button>
                } 
            />
        </div>
    )
}