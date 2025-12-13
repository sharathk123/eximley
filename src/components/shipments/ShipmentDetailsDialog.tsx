"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { List } from "lucide-react";

interface ShipmentDetailsDialogProps {
    shipment: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ShipmentDetailsDialog({
    shipment,
    open,
    onOpenChange
}: ShipmentDetailsDialogProps) {
    if (!shipment) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Shipment Details - {shipment.shipment_number}</DialogTitle>
                    <DialogDescription>
                        Order: {shipment.export_orders?.order_number}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                            <div className="font-semibold text-muted-foreground">Logistics</div>
                            <div className="grid grid-cols-[100px_1fr] gap-1">
                                <span className="text-muted-foreground">Carrier:</span> <span>{shipment.carrier || '-'}</span>
                                <span className="text-muted-foreground">Tracking:</span> <span>{shipment.tracking_number || '-'}</span>
                                <span className="text-muted-foreground">Vessel:</span> <span>{shipment.vessel_name || '-'}</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="font-semibold text-muted-foreground">Route</div>
                            <div className="grid grid-cols-[100px_1fr] gap-1">
                                <span className="text-muted-foreground">From:</span> <span>{shipment.port_of_loading || '-'}</span>
                                <span className="text-muted-foreground">To:</span> <span>{shipment.port_of_discharge || '-'}</span>
                                <span className="text-muted-foreground">Date:</span> <span>{new Date(shipment.shipment_date).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="font-semibold text-muted-foreground">Transport</div>
                            <div className="grid grid-cols-[100px_1fr] gap-1">
                                <span className="text-muted-foreground">Mode:</span> <span className="capitalize">{shipment.transport_mode || 'Sea'}</span>
                                {shipment.bl_number && <><span className="text-muted-foreground">BOL #:</span> <span>{shipment.bl_number}</span></>}
                                {shipment.bl_date && <><span className="text-muted-foreground">BOL Date:</span> <span>{new Date(shipment.bl_date).toLocaleDateString()}</span></>}
                                {shipment.awb_number && <><span className="text-muted-foreground">AWB #:</span> <span>{shipment.awb_number}</span></>}
                                {shipment.awb_date && <><span className="text-muted-foreground">AWB Date:</span> <span>{new Date(shipment.awb_date).toLocaleDateString()}</span></>}
                            </div>
                        </div>
                    </div>

                    {/* Insurance Details */}
                    {(shipment.insurance_company || shipment.insurance_policy_number) && (
                        <div className="space-y-4 border rounded-md p-4 bg-muted/30">
                            <h4 className="font-semibold text-sm">Insurance Details</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                {shipment.insurance_company && (
                                    <div><span className="text-muted-foreground">Company:</span> <span className="font-medium">{shipment.insurance_company}</span></div>
                                )}
                                {shipment.insurance_policy_number && (
                                    <div><span className="text-muted-foreground">Policy #:</span> <span className="font-medium">{shipment.insurance_policy_number}</span></div>
                                )}
                                {shipment.insurance_value && (
                                    <div><span className="text-muted-foreground">Value:</span> <span className="font-medium">{shipment.insurance_currency} {Number(shipment.insurance_value).toLocaleString()}</span></div>
                                )}
                                {shipment.insurance_date && (
                                    <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{new Date(shipment.insurance_date).toLocaleDateString()}</span></div>
                                )}
                                {shipment.insurance_coverage_type && (
                                    <div className="col-span-2"><span className="text-muted-foreground">Coverage:</span> <span className="font-medium">{shipment.insurance_coverage_type}</span></div>
                                )}
                            </div>
                        </div>
                    )}

                    <Separator />

                    <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2"><List className="h-4 w-4" /> Packing List</h4>
                        <div className="border rounded-md bg-card">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Package #</TableHead>
                                        <TableHead>Item / SKU</TableHead>
                                        <TableHead className="text-right">Quantity</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {shipment.shipment_items?.map((item: any) => (
                                        <TableRow key={item.id}>
                                            <TableCell>{item.package_number || '-'}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{item.order_items?.products?.name || 'Unknown Product'}</div>
                                                <div className="text-xs text-muted-foreground">{item.order_items?.skus?.sku_code || 'No SKU'}</div>
                                            </TableCell>
                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
