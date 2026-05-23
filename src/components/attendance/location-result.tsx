"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Shield, Clock } from "lucide-react";

interface LocationResultProps {
    lat: number;
    lng: number;
    accuracy: number;
    capturedAt?: string;
    reverseGeoAddress?: string;
    geofencePass?: boolean;
    distanceFromSite?: number;
    photoDataUrl?: string;
    showReverseGeocode?: boolean;
}

export function LocationResult({
    lat,
    lng,
    accuracy,
    capturedAt,
    reverseGeoAddress,
    geofencePass,
    distanceFromSite,
    photoDataUrl,
    showReverseGeocode = true,
}: LocationResultProps) {
    return (
        <Card className="border border-border/50">
            <CardContent className="p-4 space-y-3">
                {photoDataUrl && (
                    <div className="rounded-lg overflow-hidden border border-border/50 w-20 h-20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photoDataUrl} alt="Site survey" className="w-full h-full object-cover" />
                    </div>
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
                        <div>
                            <p className="text-xs text-muted-foreground">Latitude</p>
                            <p className="font-mono text-xs">{lat.toFixed(6)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-blue-500 shrink-0" />
                        <div>
                            <p className="text-xs text-muted-foreground">Longitude</p>
                            <p className="font-mono text-xs">{lng.toFixed(6)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-amber-500 shrink-0" />
                        <div>
                            <p className="text-xs text-muted-foreground">Accuracy</p>
                            <p className="text-xs">\u00b1{Math.round(accuracy)}m</p>
                        </div>
                    </div>
                    {capturedAt && (
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                                <p className="text-xs text-muted-foreground">Captured</p>
                                <p className="text-xs">
                                    {new Date(capturedAt).toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {showReverseGeocode && reverseGeoAddress && (
                    <div className="text-xs text-muted-foreground border-t pt-2">
                        <span className="font-medium">Address:</span> {reverseGeoAddress}
                    </div>
                )}

                {geofencePass !== undefined && (
                    <div className="flex items-center gap-2 border-t pt-2">
                        <Badge
                            variant="secondary"
                            className={
                                geofencePass
                                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                    : "bg-red-500/15 text-red-700 dark:text-red-400"
                            }
                        >
                            {geofencePass ? "Within Geofence" : "Outside Geofence"}
                        </Badge>
                        {distanceFromSite !== undefined && (
                            <span className="text-xs text-muted-foreground">
                                {distanceFromSite < 1000
                                    ? `${distanceFromSite}m from site`
                                    : `${(distanceFromSite / 1000).toFixed(1)}km from site`}
                            </span>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
