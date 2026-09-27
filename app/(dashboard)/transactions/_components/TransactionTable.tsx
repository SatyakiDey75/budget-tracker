"use client";

import { GetTransactionHistoryResponseType } from "@/app/api/transactions-history/route";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ColumnDef,
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    RowSelectionState,
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
import { DownloadIcon, MoreHorizontal, PencilIcon, SearchIcon, TrashIcon } from "lucide-react";
import Pagination from "@mui/material/Pagination";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useTheme } from "next-themes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import DeleteTransactionDialog from "./DeleteTransactionDialog";
import EditTransactionDialog from "../../_components/EditTransactionDialog";
import { DeleteTransaction } from "../_actions/deleteTransaction";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { toDate } from "date-fns";

interface Props {
    from: Date;
    to: Date;
}

type TransactionHistoryRow = GetTransactionHistoryResponseType[0];

const emptyData: any[] = [];

const columns: ColumnDef<TransactionHistoryRow>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
                onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(v) => row.toggleSelected(!!v)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
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
        accessorKey: "bankName",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Source" />
        ),
        filterFn: (row, _id, value) => {
            const b = row.original;
            const display = !b.bankName ? "—"
                : b.bankName === "Cash" ? "Cash"
                : `${b.bankName} – ${b.accountName}`;
            return value.includes(display);
        },
        cell: ({ row }) => {
            const b = row.original;
            const display = !b.bankName ? "—"
                : b.bankName === "Cash" ? "Cash"
                : `${b.bankName} – ${b.accountName}`;
            return <div className="text-muted-foreground">{display}</div>;
        },
    },
    {
        accessorKey: "merchantName",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Merchant" />
        ),
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id));
        },
        cell: ({ row }) => (
            <div className="capitalize">
                {(row.original as any).merchantName || "—"}
            </div>
        ),
    },
    {
        accessorKey: "description",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Description" />
        ),
        filterFn: (row, id, value) =>
            String(row.getValue(id)).toLowerCase().includes(String(value).toLowerCase()),
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
                <div className="">{formattedDate}</div>
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
                row.original.type === "income"
                    ? "bg-emerald-400/10 text-emerald-500"
                    : row.original.type === "investment"
                    ? "bg-blue-400/10 text-blue-500"
                    : "bg-rose-400/10 text-rose-500")}>
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
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

    const { resolvedTheme } = useTheme();
    const muiTheme = createTheme({ palette: { mode: resolvedTheme === "dark" ? "dark" : "light" } });

    const router = useRouter();
    const queryClient = useQueryClient();

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
        enableRowSelection: true,
        initialState: {
            pagination: {
                pageSize: 10,
            },
        },
        state: {
            sorting,
            columnFilters,
            rowSelection,
        },
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onRowSelectionChange: setRowSelection,
    });

    const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original);
    const selectedCount = selectedRows.length;
    const selectedNet = selectedRows.reduce((acc, t) =>
        acc + (t.type === "income" ? t.amount : -t.amount), 0);

    const { mutate: bulkDelete, isPending: isBulkDeleting } = useMutation({
        mutationFn: async (ids: string[]) => {
            for (const id of ids) await DeleteTransaction(id);
        },
        onSuccess: () => {
            toast.success("Selected transactions deleted");
            setRowSelection({});
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            queryClient.invalidateQueries({ queryKey: ["overview"] });
            queryClient.invalidateQueries({ queryKey: ["bank-history"] });
            router.refresh();
        },
        onError: () => toast.error("Failed to delete some transactions"),
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

    const sourceOptions = useMemo(() => {
        const seen = new Map<string, { value: string; label: string }>();
        history.data?.forEach((transaction) => {
            if (!transaction.bankName) return;
            const display = transaction.bankName === "Cash"
                ? "Cash"
                : `${transaction.bankName} – ${transaction.accountName}`;
            if (!seen.has(display)) {
                seen.set(display, { value: display, label: display });
            }
        });
        return Array.from(seen.values());
    }, [history.data]);

    const merchantOptions = useMemo(() => {
        const seen = new Map<string, { value: string; label: string }>();
        history.data?.forEach((transaction) => {
            const name = (transaction as any).merchantName;
            if (!name) return;
            if (!seen.has(name)) {
                seen.set(name, { value: name, label: name });
            }
        });
        return Array.from(seen.values());
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
                                { value: "investment", label: "Investments" },
                            ]}
                            column={table.getColumn("type")}
                        />
                    )}

                    { table.getColumn("bankName") && sourceOptions.length > 0 && (
                        <DataTableFacetedFilter
                            title="Source"
                            options={sourceOptions}
                            column={table.getColumn("bankName")}
                        />
                    )}

                    { table.getColumn("merchantName") && merchantOptions.length > 0 && (
                        <DataTableFacetedFilter
                            title="Merchant"
                            options={merchantOptions}
                            column={table.getColumn("merchantName")}
                        />
                    )}

                    <div className="relative ml-2">
                        <SearchIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search transaction..."
                            value={(table.getColumn("description")?.getFilterValue() as string) ?? ""}
                            onChange={(e) => table.getColumn("description")?.setFilterValue(e.target.value)}
                            className="h-8 min-w-[200px] md:w-[400px] lg:w-[700px] pl-8 text-sm"
                        />
                    </div>
                </div>


                <div className="flex flex-wrap gap-2">
                    <Button variant={"outline"} size={"sm"} className="ml-auto h-8 lg:flex" onClick={() => {
                        const data = table.getFilteredRowModel().rows.map((row) => ({
                            category: row.original.category,
                            categoryIcon: row.original.categoryIcon,
                            description: row.original.description,
                            bank: !row.original.bankName ? ""
                                : row.original.bankName === "Cash" ? "Cash"
                                : `${row.original.bankName} – ${row.original.accountName}`,
                            merchant: (row.original as any).merchantName || "",
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
            {selectedCount > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-2 mb-2">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-muted-foreground">
                            {selectedCount} row{selectedCount !== 1 ? "s" : ""} selected
                        </span>
                        <span className={cn(
                            "text-sm font-semibold",
                            selectedNet >= 0 ? "text-emerald-500" : "text-rose-500"
                        )}>
                            Net: {selectedNet >= 0 ? "+" : ""}{selectedNet.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                                const data = selectedRows.map((row) => ({
                                    category: row.category,
                                    categoryIcon: row.categoryIcon,
                                    description: row.description,
                                    bank: !row.bankName ? ""
                                        : row.bankName === "Cash" ? "Cash"
                                        : `${row.bankName} – ${row.accountName}`,
                                    merchant: (row as any).merchantName || "",
                                    type: row.type,
                                    amount: row.amount,
                                    formattedAmount: row.formattedAmount,
                                    date: row.date,
                                }));
                                handleExportCSV(data);
                            }}
                        >
                            <DownloadIcon className="mr-1 h-3 w-3" />
                            Export selected
                        </Button>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="h-7 text-xs" disabled={isBulkDeleting}>
                                    <TrashIcon className="mr-1 h-3 w-3" />
                                    Delete {selectedCount}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete {selectedCount} transaction{selectedCount !== 1 ? "s" : ""}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently remove the selected transactions and reverse their effect on your balances and history. This cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        onClick={() => bulkDelete(selectedRows.map((r) => r.id))}
                                    >
                                        Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setRowSelection({})}>
                            Clear
                        </Button>
                    </div>
                </div>
            )}

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
                <div className="flex items-center justify-between py-4">
                    {/* Left: page-size selector + record count */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Showing</span>
                        <Select
                            value={String(table.getState().pagination.pageSize)}
                            onValueChange={(v) => {
                                table.setPageSize(Number(v));
                                table.setPageIndex(0);
                            }}
                        >
                            <SelectTrigger className="h-8 w-[70px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(() => {
                                    const total = table.getFilteredRowModel().rows.length;
                                    const steps = [10, 20, 30, 40, 50].filter((s) => s < total);
                                    return [...steps, total].map((s) => (
                                        <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                                    ));
                                })()}
                            </SelectContent>
                        </Select>
                        <span>of {table.getFilteredRowModel().rows.length} records</span>
                    </div>

                    {/* Right: MUI numbered pagination */}
                    <ThemeProvider theme={muiTheme}>
                        <Pagination
                            count={table.getPageCount()}
                            page={table.getState().pagination.pageIndex + 1}
                            onChange={(_, value) => table.setPageIndex(value - 1)}
                            variant="outlined"
                            shape="rounded"
                        />
                    </ThemeProvider>
                </div>
            </SkeletonWrapper>
        </div>
  )
}

function RowActions({ transaction }: { transaction: TransactionHistoryRow }) {
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
    const [showEditDialog, setShowEditDialog] = React.useState(false);

    return (
        <>
            <DeleteTransactionDialog
                open={showDeleteDialog}
                setOpen={setShowDeleteDialog}
                transactionId={transaction.id}
            />
            <EditTransactionDialog
                open={showEditDialog}
                setOpen={setShowEditDialog}
                transaction={transaction}
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
                    <DropdownMenuItem
                        className="flex items-center gap-2"
                        onSelect={() => setShowEditDialog(true)}
                    >
                        <PencilIcon className="h-4 w-4 text-muted-foreground" />
                        Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="flex items-center gap-2"
                        onSelect={() => setShowDeleteDialog((prev) => !prev)}
                    >
                        <TrashIcon className="h-4 w-4 text-muted-foreground" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}