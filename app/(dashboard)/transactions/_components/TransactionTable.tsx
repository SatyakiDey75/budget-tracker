"use client";

import { GetTransactionHistoryResponseType } from "@/app/api/transactions-history/route";
import { useQuery } from "@tanstack/react-query";
import {
    ColumnDef,
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from "@tanstack/react-table"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import React, { useMemo, useState } from "react";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { DataTableColumnHeader } from "@/components/datatable/ColumnHeader";
import { cn } from "@/lib/utils";
import { DataTableFacetedFilter } from "@/components/datatable/FacetedFilters";
import { DataTableViewOptions } from "@/components/datatable/ColumnToggle";
import { Button } from "@/components/ui/button";
import { download, generateCsv, mkConfig } from "export-to-csv";
import { DownloadIcon, MoreHorizontal, TrashIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import DeleteTransactionDialog from "./DeleteTransactionDialog";
import { toDate } from "date-fns";

interface Props {
    from: Date;
    to: Date;
}

type TransactionHistoryRow = GetTransactionHistoryResponseType[0];

const emptyData: any[] = [];

const columns: ColumnDef<TransactionHistoryRow>[] = [
    {
        accessorKey: "category",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Category" />
        ),
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id));
        },
        cell: ({ row }) => <div className="flex gap-2 capitalize">
            {row.original.categoryIcon}
            <div className="capitalize">{row.original.category}</div>
        </div>,
    },
    {
        accessorKey: "description",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Description" />
        ),
        cell: ({ row }) => (
            <div className="capitalize">{row.original.description}</div>
        ),
    },
    {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => {
            const date = new Date(row.original.date);
            const formattedDate = date.toLocaleDateString("default", {
                timeZone: "IST",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            });
            return (
                <div className="text-muted-foreground">{formattedDate}</div>
            )
        },
    },
    {
        accessorKey: "type",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Type" />
        ),
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id));
        },
        cell: ({ row }) => (
            <div className={cn("capitalize rounded-lg text-center p-2", 
                row.original.type === "income" ? "bg-emerald-400/10 text-emerald-500" : "bg-rose-400/10 text-rose-500")}>
                {row.original.type}
            </div>
        ),
    },
    {
        accessorKey: "amount",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Amount" />
        ),
        cell: ({ row }) => (
            <p className="text-md rounded-lg bg-gray-400/5 p-2 text-center font-medium">{row.original.formattedAmount}</p>
        ),
    },
    {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => (
            <RowActions transaction={row.original} />
        ),
    },
];

const csvConfig = mkConfig({
    fieldSeparator: ",",
    decimalSeparator: ".",
    useKeysAsHeaders: true,
});

export default function TransactionTable({ from, to }: Props) {

    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

    const history = useQuery<GetTransactionHistoryResponseType>({
        queryKey: ["transactions", "history", from, to],
        queryFn: () => fetch(`/api/transactions-history?from=${toDate(from)}&to=${toDate(to)}`).then((res) => res.json()),
    });

    const handleExportCSV = (data: any[]) => {
        const csv = generateCsv(csvConfig)(data);
        download(csvConfig)(csv);
    };

    const table = useReactTable({
        data: history.data || emptyData,
        columns,
        getCoreRowModel: getCoreRowModel(),
        initialState: {
            pagination: {
                pageSize: 10,
            },
        },
        state: {
            sorting,
            columnFilters,
        },
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const categoriesOptions = useMemo(() => {
        const categoriesMap = new Map();
        history.data?.forEach((transaction) => {
            categoriesMap.set(transaction.category, {
                value: transaction.category,
                label: `${transaction.categoryIcon} ${transaction.category}`,
            });
        });
        const uniqueCategories = new Set(categoriesMap.values());
        return Array.from(uniqueCategories);
    }, [history.data]);

    return (
        <div className="w-full">
            <div className="flex flex-wrap items-center justify-between gap-2 py-4">
                <div className="flex gap-2">
                    { table.getColumn("category") && (
                        <DataTableFacetedFilter
                            title="Category"
                            options={categoriesOptions} 
                            column={table.getColumn("category")} 
                        />
                    )}

                    { table.getColumn("type") && (
                        <DataTableFacetedFilter
                            title="Type"
                            options={[
                                { value: "income", label: "Income" },
                                { value: "expense", label: "Expense" },
                            ]}
                            column={table.getColumn("type")} 
                        />
                    )}
                </div>
                
                <div className="flex flex-wrap gap-2">
                    <Button variant={"outline"} size={"sm"} className="ml-auto h-8 lg:flex" onClick={() => {
                        const data = table.getFilteredRowModel().rows.map((row) => ({
                            category: row.original.category,
                            categoryIcon: row.original.categoryIcon,
                            description: row.original.description,
                            type: row.original.type,
                            amount: row.original.amount,
                            formattedAmount: row.original.formattedAmount,
                            date: row.original.date,
                        }));
                        handleExportCSV(data);
                    }}>
                        <DownloadIcon className="my-2 h-4 w-4" />
                        Export CSV
                    </Button>
                    <DataTableViewOptions table={table} />
                </div>
            </div>
            <SkeletonWrapper isLoading={history.isLoading}>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                return (
                                <TableHead key={header.id}>
                                    {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                        header.column.columnDef.header,
                                        header.getContext()
                                        )}
                                </TableHead>
                                )
                            })}
                            </TableRow>
                        ))}
                        </TableHeader>
                        <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                            <TableRow
                                key={row.id}
                                data-state={row.getIsSelected() && "selected"}
                            >
                                {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id}>
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                                ))}
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">
                                No results.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex items-center justify-end space-x-2 py-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Next
                    </Button>
                </div>
            </SkeletonWrapper>
        </div>
  )
}

function RowActions({ transaction }: { transaction: TransactionHistoryRow }) {
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

    return (
        <>
            <DeleteTransactionDialog
                open={showDeleteDialog}
                setOpen={setShowDeleteDialog}
                transactionId={transaction.id} 
            />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant={"ghost"} className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="flex items-center gap-2" onSelect={() => {setShowDeleteDialog((prev) => !prev)}}>
                        <TrashIcon className="h-4 w-4 text-muted-foreground" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    )
}