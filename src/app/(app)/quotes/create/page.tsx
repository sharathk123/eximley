"use client";

import { QuoteForm } from "@/components/quotes/QuoteForm";

export default function CreateQuotePage() {
    return (
        <div className="container mx-auto py-10">
            <QuoteForm mode="create" />
        </div>
    );
}
