"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <Card className="min-h-80">
      <CardContent className="flex flex-1 items-center justify-center py-12">
        <div className="max-w-md text-center">
          <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle aria-hidden="true" className="size-5" />
          </div>
          <h1 className="mt-5 text-xl font-semibold tracking-tight">
            This page could not be loaded
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            The operations shell is still available. Try loading this area again.
          </p>
          <Button className="mt-6" onClick={reset}>
            <RotateCcw aria-hidden="true" data-icon="inline-start" />
            Try again
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
