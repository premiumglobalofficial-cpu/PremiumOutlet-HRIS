"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, Loader2, MapPin } from "lucide-react";

interface SelfieCaptureProps {
    compressionQuality?: number;
    onCapture: (data: {
        photoDataUrl: string;
        gpsLat: number;
        gpsLng: number;
        gpsAccuracyMeters: number;
    }) => void;
    onCancel: () => void;
}

export function SelfieCapture({ compressionQuality = 0.6, onCapture, onCancel }: SelfieCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [, setCapturing] = useState(false);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [gpsData, setGpsData] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);

    // Start camera on mount
    useEffect(() => {
        let cancelled = false;
        const startCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
                });
                if (cancelled) { mediaStream.getTracks().forEach((t) => t.stop()); return; }
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch {
                setError("Camera access denied. Please enable camera permissions.");
            }
        };
        startCamera();
        return () => {
            cancelled = true;
            stream?.getTracks().forEach((t) => t.stop());
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Clean up stream on unmount
    useEffect(() => {
        return () => { stream?.getTracks().forEach((t) => t.stop()); };
    }, [stream]);

    const handleCapture = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;
        setCapturing(true);
        setGpsLoading(true);

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
            // Mirror for selfie
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
        const photoDataUrl = canvas.toDataURL("image/jpeg", compressionQuality);
        setPreview(photoDataUrl);

        // Get GPS
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setGpsData({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracy: pos.coords.accuracy,
                    });
                    setGpsLoading(false);
                },
                () => {
                    setError("GPS access denied. Please enable location services.");
                    setGpsLoading(false);
                    setCapturing(false);
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
        } else {
            setError("Geolocation is not supported by this browser.");
            setGpsLoading(false);
            setCapturing(false);
        }
    }, [compressionQuality]);

    const handleConfirm = () => {
        if (!preview || !gpsData) return;
        // Stop camera
        stream?.getTracks().forEach((t) => t.stop());
        onCapture({
            photoDataUrl: preview,
            gpsLat: gpsData.lat,
            gpsLng: gpsData.lng,
            gpsAccuracyMeters: gpsData.accuracy,
        });
    };

    const handleRetake = () => {
        setPreview(null);
        setGpsData(null);
        setCapturing(false);
        setError(null);
    };

    if (error && !preview) {
        return (
            <div className="flex flex-col items-center gap-4 p-6">
                <div className="text-red-500 text-sm text-center">{error}</div>
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Hidden canvas for snapshot */}
            <canvas ref={canvasRef} className="hidden" />

            {!preview ? (
                <>
                    <div className="relative rounded-xl overflow-hidden border border-border bg-black w-full max-w-sm aspect-[4/3]">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover scale-x-[-1]"
                        />
                        {/* Viewfinder overlay */}
                        <div className="absolute inset-0 border-2 border-dashed border-white/20 rounded-xl pointer-events-none" />
                        <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                            <span className="text-[10px] text-white/50 bg-black/50 px-2 py-0.5 rounded-full">
                                Position your face in the frame
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onCancel}>Cancel</Button>
                        <Button onClick={handleCapture} className="gap-1.5">
                            <Camera className="h-4 w-4" /> Capture
                        </Button>
                    </div>
                </>
            ) : (
                <>
                    <div className="relative rounded-xl overflow-hidden border border-border w-full max-w-sm aspect-[4/3]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview} alt="Selfie preview" className="w-full h-full object-cover" />
                    </div>

                    {/* GPS status */}
                    <div className="flex items-center gap-2 text-sm">
                        {gpsLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                <span className="text-muted-foreground">Acquiring GPS location...</span>
                            </>
                        ) : gpsData ? (
                            <>
                                <MapPin className="h-4 w-4 text-emerald-500" />
                                <span className="font-mono text-xs">
                                    {gpsData.lat.toFixed(6)}, {gpsData.lng.toFixed(6)}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                    (\u00b1{Math.round(gpsData.accuracy)}m)
                                </span>
                            </>
                        ) : null}
                    </div>

                    {error && <div className="text-red-500 text-xs">{error}</div>}

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleRetake} className="gap-1.5">
                            <RotateCcw className="h-4 w-4" /> Retake
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={gpsLoading || !gpsData}
                            className="gap-1.5"
                        >
                            Confirm Check-In
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
