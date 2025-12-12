# Eximley Design System Standards

This document outlines the standard frameworks and themes to be used across the Eximley application to ensure a consistent, premium user experience.

## 0. UI Framework & Library

We use **Shadcn UI** as our foundational component library.

*   **Source**: `@/components/ui` (Local Shadcn components)
*   **Styling**: **Tailwind CSS**
*   **Icons**: **Lucide React**
*   **Utils**: `cn()` utility in `@/lib/utils.ts` for class merging.

## 1. Color Palette

The application uses a specific "Primary Purple" theme. All new components should adhere to this palette.

*   **Primary**: `#635bff` (Purple) - Used for primary buttons, active states, and key accents.
*   **Secondary**: `#f6f6ff` (Lavender) - Used for backgrounds of active items or subtle highlights.
*   **Muted**: `#f9fafb` (Gray) - Used for backgrounds, borders, and secondary text.
*   **Destructive**: `#dc2626` (Red) - Used for delete actions and error states.

### Usage in Tailwind
Always use the semantic class names rather than hardcoded hex values:
*   `text-primary` / `bg-primary`
*   `text-muted-foreground`
*   `bg-muted`
*   `border-border`

## 2. Standard Components

To maintain consistency, use the following shared components instead of building custom UIs for common patterns.

### Page Header (`<PageHeader />`)
Used at the top of every main page (List views, Dashboards).
*   **Path**: `@/components/ui/page-header.tsx`
*   **Props**: `title`, `description`, `children` (for action buttons)
*   **Example**:
    ```tsx
    import { PageHeader } from "@/components/ui/page-header";

    <PageHeader
        title="Enquiries"
        description="Manage customer enquiries."
    >
        <Button>Add New</Button>
    </PageHeader>
    ```

### Empty State (`<EmptyState />`)
Used whenever a list or table has no data. Defaults to the Primary Purple theme.
*   **Path**: `@/components/ui/empty-state.tsx`
*   **Props**: `icon`, `title`, `description`, `actionLabel`, `onAction`
*   **Example**:
    ```tsx
    import { EmptyState } from "@/components/ui/empty-state";

    <EmptyState
        icon={FileText}
        title="No items found"
        description="Get started by creating a new item."
        actionLabel="Create Item"
        onAction={handleCreate}
    />
    ```
    *Note: The `EmptyState` component has been updated to default to the `primary` theme, so manual color overrides are no longer needed.*

## 3. Typography

*   **Page Titles**: `text-3xl font-bold tracking-tight text-foreground` (Handled by `PageHeader`)
*   **Section Headers**: `text-lg font-semibold`
*   **Body Text**: `text-sm text-foreground`
*   **Secondary Text**: `text-sm text-muted-foreground`

## 4. Page Layout Patterns

### List View Pattern
1.  **Header**: `<PageHeader />` with Title, Description, and Primary Action Button.
2.  **Filters**: Search Bar (`max-w-sm`) + View Toggle (List/Card) + Filter Tabs.
3.  **Content**:
    *   **Loading**: Centralized Spinner.
    *   **Empty**: `<EmptyState />`.
    *   **Data**: Table or Grid of Cards.
4.  **Pagination**: Standard Shadcn Pagination at the bottom.

### Detail View Pattern
1.  **Header**: Custom Header with Breadcrumb/Back button, Title (ID/Name), Status Badge, and Action Buttons.
2.  **Tabs**: `Details` (Default), `Items`/`Products`, `Documents`, `Preview`.
3.  **Cards**: Use `Card`, `CardHeader` (with light gray background `bg-muted/20`), and `CardContent` for grouping details.

## 5. Icons
Use **Lucide React** icons.
*   Standard size: `h-4 w-4` for buttons/menus.
*   Empty State size: `h-12 w-12` (wrapper), `h-6 w-6` (icon).
