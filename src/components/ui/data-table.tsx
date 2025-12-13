import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { SearchInput } from "@/components/ui/search-input";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowUpDown, ArrowUp, ArrowDown, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Column definition for DataTable
 */
export interface DataTableColumn<T> {
    /** Unique key for the column */
    key: string;
    /** Header text */
    header: string;
    /** Render function for cell content */
    cell: (row: T) => React.ReactNode;
    /** Optional column width (Tailwind class) */
    width?: string;
    /** Enable sorting for this column */
    sortable?: boolean;
    /** Optional className for header */
    headerClassName?: string;
    /** Optional className for cells */
    cellClassName?: string;
}

/**
 * Props for DataTable component
 */
export interface DataTableProps<T> {
    /** Array of data to display */
    data: T[];
    /** Column configuration */
    columns: DataTableColumn<T>[];
    /** Keys to search across (for built-in search) */
    searchKeys?: (keyof T)[];
    /** Placeholder for search input */
    searchPlaceholder?: string;
    /** Callback when row is clicked */
    onRowClick?: (row: T) => void;
    /** Render actions column (optional) */
    actions?: (row: T) => React.ReactNode;
    /** Custom empty state component */
    emptyState?: React.ReactNode;
    /** Loading state */
    loading?: boolean;
    /** Loading message */
    loadingMessage?: string;
    /** Additional className for table container */
    className?: string;
    /** Make table fixed layout */
    fixedLayout?: boolean;
}

/**
 * DataTable Component
 * 
 * A reusable table component with built-in search, sorting, and customizable rendering.
 * 
 * @example
 * ```tsx
 * <DataTable
 *   data={users}
 *   columns={[
 *     { key: 'name', header: 'Name', cell: (user) => user.name, sortable: true },
 *     { key: 'email', header: 'Email', cell: (user) => user.email }
 *   ]}
 *   searchKeys={['name', 'email']}
 *   onRowClick={(user) => handleEdit(user)}
 *   actions={(user) => <Button onClick={() => deleteUser(user)}>Delete</Button>}
 * />
 * ```
 */
export function DataTable<T extends { id: string }>({
    data,
    columns,
    searchKeys,
    searchPlaceholder = "Search...",
    onRowClick,
    actions,
    emptyState,
    loading = false,
    loadingMessage = "Loading data...",
    className,
    fixedLayout = true,
}: DataTableProps<T>) {
    const [searchQuery, setSearchQuery] = useState("");
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

    // Filter data based on search query
    const filteredData = useMemo(() => {
        if (!searchQuery || !searchKeys || searchKeys.length === 0) {
            return data;
        }

        const query = searchQuery.toLowerCase();
        return data.filter((row) => {
            return searchKeys.some((key) => {
                const value = row[key];
                if (value === null || value === undefined) return false;
                return String(value).toLowerCase().includes(query);
            });
        });
    }, [data, searchQuery, searchKeys]);

    // Sort data based on active sort
    const sortedData = useMemo(() => {
        if (!sortKey) return filteredData;

        return [...filteredData].sort((a, b) => {
            // Find the column for custom cell rendering
            const column = columns.find(col => col.key === sortKey);
            if (!column) return 0;

            // Get values - try to use the key directly from data
            const aValue = (a as any)[sortKey];
            const bValue = (b as any)[sortKey];

            // Handle null/undefined
            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;

            // Compare based on type
            let comparison = 0;
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                comparison = aValue.localeCompare(bValue);
            } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                comparison = aValue - bValue;
            } else {
                comparison = String(aValue).localeCompare(String(bValue));
            }

            return sortDirection === "asc" ? comparison : -comparison;
        });
    }, [filteredData, sortKey, sortDirection, columns]);

    // Handle sort toggle
    const handleSort = (columnKey: string) => {
        if (sortKey === columnKey) {
            // Toggle direction
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            // New sort key
            setSortKey(columnKey);
            setSortDirection("asc");
        }
    };

    // Render sort icon
    const renderSortIcon = (columnKey: string) => {
        if (sortKey !== columnKey) {
            return <ArrowUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />;
        }
        return sortDirection === "asc"
            ? <ArrowUp className="ml-2 h-4 w-4 shrink-0" />
            : <ArrowDown className="ml-2 h-4 w-4 shrink-0" />;
    };

    // Show loading state
    if (loading) {
        return <LoadingState message={loadingMessage} size="sm" />;
    }

    return (
        <div className={cn("space-y-4", className)}>
            {/* Search Input */}
            {searchKeys && searchKeys.length > 0 && (
                <SearchInput
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    aria-label="Search table data"
                />
            )}

            {/* Table */}
            <div className="rounded-md border">
                <Table className={fixedLayout ? "table-fixed" : ""} aria-label="Data table">
                    <TableHeader>
                        <TableRow>
                            {columns.map((column) => (
                                <TableHead
                                    key={column.key}
                                    className={cn(
                                        column.width,
                                        column.headerClassName,
                                        column.sortable && "cursor-pointer select-none"
                                    )}
                                    onClick={() => column.sortable && handleSort(column.key)}
                                    role={column.sortable ? "button" : undefined}
                                    tabIndex={column.sortable ? 0 : undefined}
                                    aria-label={column.sortable ? `Sort by ${column.header}` : undefined}
                                    onKeyDown={(e) => {
                                        if (column.sortable && (e.key === 'Enter' || e.key === ' ')) {
                                            e.preventDefault();
                                            handleSort(column.key);
                                        }
                                    }}
                                >
                                    <div className="flex items-center">
                                        {column.header}
                                        {column.sortable && renderSortIcon(column.key)}
                                    </div>
                                </TableHead>
                            ))}
                            {actions && (
                                <TableHead className="w-[100px] text-right">
                                    Actions
                                </TableHead>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedData.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length + (actions ? 1 : 0)}
                                    className="h-64 text-center"
                                >
                                    {emptyState || (
                                        <EmptyState
                                            icon={FileQuestion}
                                            title="No data found"
                                            description={
                                                searchQuery
                                                    ? "Try adjusting your search"
                                                    : "No items to display"
                                            }
                                        />
                                    )}
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedData.map((row) => (
                                <TableRow
                                    key={row.id}
                                    className={onRowClick ? "cursor-pointer" : ""}
                                    onClick={() => onRowClick?.(row)}
                                >
                                    {columns.map((column) => (
                                        <TableCell
                                            key={column.key}
                                            className={cn(
                                                "align-top py-3 whitespace-normal", // Override whitespace-nowrap default
                                                column.cellClassName
                                            )}
                                        >
                                            <div className="break-words min-w-0">
                                                {column.cell(row)}
                                            </div>
                                        </TableCell>
                                    ))}
                                    {actions && (
                                        <TableCell
                                            className="text-right"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {actions(row)}
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>


        </div>
    );
}
