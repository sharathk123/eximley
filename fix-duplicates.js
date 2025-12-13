// Fix duplicate id issue in all routes
const fs = require('fs');
const path = require('path');

const routes = [
    'src/app/api/orders/[id]/generate-pdf/route.ts',
    'src/app/api/orders/[id]/approve/route.ts',
    'src/app/api/orders/[id]/reject/route.ts',
    'src/app/api/orders/[id]/revise/route.ts',
    'src/app/api/proforma/[id]/convert-commercial/route.ts',
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

    // Fix duplicate const invoiceId/orderId declarations
    // Replace pattern: const { id } = await params;\n...const invoiceId = id;
    // With: const { id: invoiceId } = await params;

    const patterns = [
        { old: /const { id } = await params;\n([\s\S]*?)\n\s*const invoiceId = id;/, new: 'const { id: invoiceId } = await params;$1' },
        { old: /const { id } = await params;\n([\s\S]*?)\n\s*const orderId = id;/, new: 'const { id: orderId } = await params;$1' },
        { old: /const { id } = await params;\n([\s\S]*?)\n\s*const billId = id;/, new: 'const { id: billId } = await params;$1' },
        { old: /const { id } = await params;\n([\s\S]*?)\n\s*const purchaseOrderId = id;/, new: 'const { id: purchaseOrderId } = await params;$1' },
    ];

    patterns.forEach(({ old, new: replacement }) => {
        content = content.replace(old, replacement);
    });

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Fixed duplicates in ${route}`);
});

console.log('\nAll duplicates fixed!');
