import Link from "next/link";
import { ArrowLeft, MapPinOff } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <MapPinOff aria-hidden="true" className="size-5" />
        </div>
        <p className="mt-5 text-xs font-semibold tracking-[0.12em] text-primary uppercase">
          Route not found
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          This operations area does not exist yet
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Return to the workspace overview and choose an available module.
        </p>
        <Button
          render={<Link href="/" />}
          nativeButton={false}
          className="mt-6"
        >
          <ArrowLeft aria-hidden="true" data-icon="inline-start" />
          Back to Overview
        </Button>
      </div>
    </main>
  );
}
