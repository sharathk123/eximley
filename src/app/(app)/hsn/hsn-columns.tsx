import { DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";

export interface HSNCode {
    id: string;
    itc_hs_code: string;
    gst_hsn_code: string;
    chapter: string;
    commodity: string;
    itc_hs_code_description: string;
    gst_hsn_code_description: string;
    gst_rate: number;
    govt_published_date?: string;
}

export const hsnColumns: DataTableColumn<HSNCode>[] = [
    {
        key: "itc_hs_code",
        header: "ITC HS",
        width: "w-[120px]",
        cell: (row) => (
            <div className="inline-flex items-center rounded-md border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-xs font-semibold text-primary font-mono">
                {row.itc_hs_code}
            </div>
        )
    },
    {
        key: "gst_hsn_code",
        header: "GST HSN",
        width: "w-[120px]",
        cell: (row) => (
            <div className="flex flex-col gap-1 items-start">
                <div className="inline-flex items-center rounded-md border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground font-mono">
                    {row.gst_hsn_code}
                </div>
                {row.govt_published_date && (
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        FY {new Date(row.govt_published_date).getFullYear()}
                    </span>
                )}
            </div>
        )
    },
    {
        key: "chapter",
        header: "Chapter",
        width: "w-[150px]",
        cell: (row) => (
            <div className="text-sm font-medium text-foreground/80 leading-snug whitespace-normal break-words w-[150px]">
                {row.chapter || <span className="text-muted-foreground/40 italic">-</span>}
            </div>
        )
    },
    {
        key: "commodity",
        header: "Commodity",
        width: "w-[200px]",
        cell: (row) => (
            <div className="text-sm text-foreground/70 leading-snug whitespace-normal break-words w-[200px]">
                {row.commodity || <span className="text-muted-foreground/40 italic">-</span>}
            </div>
        )
    },
    {
        key: "itc_hs_code_description",
        header: "ITC HS Description",
        width: "min-w-[250px]",
        cell: (row) => (
            <div className="text-sm text-foreground/90 leading-relaxed whitespace-normal break-words min-w-[250px]">
                {row.itc_hs_code_description || <span className="text-muted-foreground/40 italic">No description available</span>}
            </div>
        )
    },
    {
        key: "gst_hsn_code_description",
        header: "GST HSN Description",
        width: "min-w-[250px]",
        cell: (row) => (
            <div className="text-sm text-foreground/90 leading-relaxed whitespace-normal break-words min-w-[250px]">
                {row.gst_hsn_code_description || <span className="text-muted-foreground/40 italic">No description available</span>}
            </div>
        )
    },
    {
        key: "gst_rate",
        header: "GST %",
        width: "w-[100px]",
        cell: (row) => {
            if (row.gst_rate === null || row.gst_rate === undefined) {
                return <span className="text-muted-foreground/40 italic">-</span>;
            }
            const rate = row.gst_rate;
            if (rate > 18) return <Badge variant="destructive" className="bg-destructive/10 text-destructive">{rate}%</Badge>;
            if (rate > 12) return <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200">{rate}%</Badge>;
            return <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200">{rate}%</Badge>;
        }
    }
];

