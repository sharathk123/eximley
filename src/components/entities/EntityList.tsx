"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Edit,
    Trash2,
    CheckCircle2,
    MapPin,
    Mail,
    Phone
} from "lucide-react";

interface EntityListProps {
    entities: any[];
    viewMode: 'card' | 'list';
    onEdit: (entity: any) => void;
    onDelete: (entity: any) => void;
}

export function EntityList({
    entities,
    viewMode,
    onEdit,
    onDelete
}: EntityListProps) {

    if (viewMode === 'card') {
        return (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {entities.map((entity) => (
                    <Card key={entity.id} className="shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-5 space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="font-semibold text-lg flex items-center gap-2">
                                        {entity.name}
                                        {entity.verification_status === 'verified' && (
                                            <CheckCircle2 className="w-4 h-4 text-primary" />
                                        )}
                                    </div>
                                    <div className="text-sm text-muted-foreground capitalize">{entity.type}</div>
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => onEdit(entity)}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive"
                                        onClick={() => onDelete(entity)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <Badge variant={entity.verification_status === 'verified' ? "default" : "secondary"}>
                                {entity.verification_status === 'verified' ? "Verified" : "Unverified"}
                            </Badge>

                            <div className="space-y-1 text-sm text-muted-foreground pt-2">
                                {entity.country && (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-muted-foreground" /> {entity.country}
                                    </div>
                                )}
                                {entity.email && (
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-muted-foreground" /> {entity.email}
                                    </div>
                                )}
                                {entity.phone && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-muted-foreground" /> {entity.phone}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="border rounded-md bg-card">
            <Table className="table-fixed">
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="w-[200px]">Name</TableHead>
                        <TableHead className="w-[120px]">Type</TableHead>
                        <TableHead className="w-[220px]">Email</TableHead>
                        <TableHead className="w-[150px]">Country</TableHead>
                        <TableHead className="w-[120px]">Status</TableHead>
                        <TableHead className="w-[120px] text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {entities.map((entity) => (
                        <TableRow key={entity.id}>
                            <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                    {entity.name}
                                    {entity.verification_status === 'verified' && (
                                        <CheckCircle2 className="w-4 h-4 text-primary" />
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="capitalize">{entity.type}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                                {entity.email || "—"}
                            </TableCell>
                            <TableCell>{entity.country || "—"}</TableCell>
                            <TableCell>
                                <Badge variant={entity.verification_status === 'verified' ? "default" : "secondary"}>
                                    {entity.verification_status === 'verified' ? "Verified" : "Unverified"}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => onEdit(entity)}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive"
                                        onClick={() => onDelete(entity)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
