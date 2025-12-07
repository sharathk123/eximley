# Pagination Update Checklist

## Pages to Update
- [x] Products
- [ ] Entities
- [ ] Enquiries
- [ ] Orders
- [ ] Quotes
- [ ] Purchase Orders
- [ ] Invoices
- [ ] Shipments

## Changes Needed for Each Page

### 1. Add imports
Add `ChevronLeft, ChevronRight` to lucide-react imports

### 2. Replace Pagination Component
Replace the `<Pagination>` component with:

```tsx
{totalPages > 1 && (
    <div className="flex items-center justify-end gap-2 text-sm">
        <div className="text-muted-foreground mr-4">
            Page {currentPage} of {totalPages} ({filteredItems.length} total)
        </div>
        <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
        >
            <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
        >
            <ChevronRight className="h-4 w-4" />
        </Button>
    </div>
)}
```

Note: Replace `filteredItems` with the appropriate variable for each page (e.g., `filteredEntities`, `filteredEnquiries`, etc.)
