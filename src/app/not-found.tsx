"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFoundPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center">
                <FileQuestion className="h-10 w-10 text-muted-foreground" />
            </div>
            <h1 className="text-3xl font-bold">Page Not Found</h1>
            <p className="text-muted-foreground text-sm max-w-md text-center">
                The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
            <Link href="/">
                <Button className="gap-1.5 mt-2">Go to Dashboard</Button>
            </Link>
        </div>
    );
}
