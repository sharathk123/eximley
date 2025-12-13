// Script to fix all Next.js 16 async params issues
const fs = require('fs');
const path = require('path');

// Routes that need fixing
const routes = [
    'src/app/api/orders/[id]/generate-pdf/route.ts',
    'src/app/api/orders/[id]/approve/route.ts',
    'src/app/api/orders/[id]/reject/route.ts',
    'src/app/api/orders/[id]/revise/route.ts',
    'src/app/api/proforma/[id]/convert-commercial/route.ts',
    'src/app/api/invoices/proforma/[id]/revise/route.ts',
    'src/app/api/invoices/proforma/[id]/reject/route.ts',
    'src/app/api/purchase-orders/[id]/generate-pdf/route.ts',
    'src/app/api/purchase-orders/[id]/approve/route.ts',
    'src/app/api/purchase-orders/[id]/reject/route.ts',
    'src/app/api/purchase-orders/[id]/revise/route.ts',
    'src/app/api/shipping-bills/[id]/revise/route.ts',
    'src/app/api/shipping-bills/[id]/approve/route.ts',
    'src/app/api/shipping-bills/[id]/reject/route.ts',
    'src/app/api/shipping-bills/[id]/generate-pdf/route.ts'
];

routes.forEach(route => {
    const filePath = path.join(process.cwd(), route);
    if (!fs.existsSync(filePath)) {
        console.log(`Skipping ${route} - file not found`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // Step 1: Update params type from { id: string } to Promise<{ id: string }>
    content = content.replace(
        /{ params }: { params: { id: string } }/g,
        '{ params }: { params: Promise<{ id: string }> }'
    );

    // Step 2: Add await params at the start of the function (after first {)
    content = content.replace(
        /(export async function \w+\([^)]+\) \{\n)/,
        '$1    const { id } = await params;\n'
    );

    // Step 3: Replace params.id with id
    content = content.replace(/params\.id/g, 'id');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Fixed ${route}`);
});

console.log('\nAll routes fixed!');
