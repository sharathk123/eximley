#!/bin/bash

# Fix Next.js 16 async params - batch update all routes

echo "Fixing async params in API routes..."

# List of files that need fixing
files=(
    "src/app/api/orders/[id]/generate-pdf/route.ts"
    "src/app/api/orders/[id]/approve/route.ts"
    "src/app/api/orders/[id]/reject/route.ts"
    "src/app/api/orders/[id]/revise/route.ts"
    "src/app/api/proforma/[id]/convert-commercial/route.ts"
    "src/app/api/invoices/proforma/[id]/revise/route.ts"
    "src/app/api/invoices/proforma/[id]/approve/route.ts"
    "src/app/api/invoices/proforma/[id]/reject/route.ts"
    "src/app/api/purchase-orders/[id]/generate-pdf/route.ts"
    "src/app/api/purchase-orders/[id]/approve/route.ts"
    "src/app/api/purchase-orders/[id]/reject/route.ts"
   "src/app/api/purchase-orders/[id]/revise/route.ts"
    "src/app/api/shipping-bills/[id]/revise/route.ts"
    "src/app/api/shipping-bills/[id]/approve/route.ts"
    "src/app/api/shipping-bills/[id]/reject/route.ts"
    "src/app/api/shipping-bills/[id]/generate-pdf/route.ts"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "Fixing $file"
        # Replace { params: { id: string } } with { params: Promise<{ id: string }> }
        sed -i.bak 's/{ params }: { params: { id: string } }/{ params }: { params: Promise<{ id: string }> }/g' "$file"
        # Add await for params.id
        sed -i.bak 's/params\.id/resolvedParams.id/g' "$file"
        # Add const resolvedParams = await params at the start of function
        sed -i.bak '/export async function/a\
    const resolvedParams = await params;
' "$file"
        rm "${file}.bak"
    fi
done

echo "Done!"
