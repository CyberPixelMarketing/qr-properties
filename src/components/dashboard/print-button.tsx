"use client";
import { Printer } from "@/components/icons";
import { Button } from "@/components/ui";

export function PrintButton({ label }: { label: string }) {
  return (
    <Button type="button" onClick={() => window.print()}>
      <Printer className="size-4" aria-hidden />
      {label}
    </Button>
  );
}
