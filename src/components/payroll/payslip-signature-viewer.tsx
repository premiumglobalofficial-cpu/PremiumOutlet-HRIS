"use client";

import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Eye, CheckCircle } from "lucide-react";

interface PayslipSignatureViewerProps {
    open: boolean;
    onClose: () => void;
    employeeName: string;
    period: string;
    netPay: string;
    signatureDataUrl?: string;
    signedAt?: string;
    status: string;
}

export function PayslipSignatureViewer({
    open,
    onClose,
    employeeName,
    period,
    netPay,
    signatureDataUrl,
    signedAt,
    status,
}: PayslipSignatureViewerProps) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Signature Verification
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-1">
                        <p className="text-sm"><span className="text-muted-foreground">Employee:</span> {employeeName}</p>
                        <p className="text-sm"><span className="text-muted-foreground">Period:</span> {period}</p>
                        <p className="text-sm"><span className="text-muted-foreground">Net Pay:</span> {netPay}</p>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Status:</span>
                            <Badge variant="secondary">{status}</Badge>
                        </div>
                    </div>

                    {signatureDataUrl ? (
                        <div className="space-y-2">
                            <div className="border rounded-lg p-4 bg-white flex items-center justify-center min-h-[120px]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={signatureDataUrl}
                                    alt={`${employeeName}'s signature`}
                                    className="max-h-32 w-auto"
                                />
                            </div>
                            {signedAt && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <CheckCircle className="h-3 w-3 text-emerald-500" />
                                    Signed on {new Date(signedAt).toLocaleString()}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-sm text-muted-foreground">No signature on file</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
