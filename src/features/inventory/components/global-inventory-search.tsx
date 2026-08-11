"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Boxes, FolderKanban, MapPin, Search } from "lucide-react";
import { inventorySearchResults } from "@/features/inventory/data/mock-data";
import type { InventorySearchResult } from "@/features/inventory/types/inventory";

const resultIcons: Record<InventorySearchResult["type"], typeof Search> = { Project: FolderKanban, Material: Boxes, Storage: MapPin };

export function GlobalInventorySearch() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();
  const results = normalizedQuery ? inventorySearchResults.filter((result) => result.searchText.includes(normalizedQuery)).slice(0, 7) : [];

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => { if (event.ctrlKey && event.key.toLowerCase() === "m") { event.preventDefault(); inputRef.current?.focus(); setOpen(true); } };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  return (
    <>
    <Link href="/inventory#inventory-project-search" aria-label="Search inventory" className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"><Search aria-hidden="true" className="size-4" /></Link>
    <div className="relative hidden lg:block" role="search">
      <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
      <input ref={inputRef} name="global-inventory-search" autoComplete="off" value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); inputRef.current?.blur(); } }} placeholder="Search" aria-label="Search inventory" role="combobox" aria-autocomplete="list" aria-expanded={open && Boolean(normalizedQuery)} aria-controls="global-search-results" className="h-9 w-52 rounded-lg border bg-card pr-14 pl-9 text-sm outline-none transition-[width,border-color,box-shadow] placeholder:text-muted-foreground focus:w-64 focus:border-ring focus:ring-3 focus:ring-ring/30 xl:w-64 xl:focus:w-72" />
      <kbd className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">Ctrl M</kbd>
      {open && normalizedQuery ? <div id="global-search-results" className="absolute top-11 right-0 z-50 w-96 overflow-hidden rounded-xl border bg-popover p-1.5 shadow-xl">
        {results.length ? results.map((result) => { const Icon = resultIcons[result.type]; return <Link key={`${result.type}-${result.id}`} href={result.href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 outline-none hover:bg-muted focus-visible:bg-muted" onClick={() => { setOpen(false); setQuery(""); }}><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary"><Icon aria-hidden="true" className="size-4" /></span><span className="min-w-0"><span className="block truncate text-sm font-medium">{result.title}</span>{result.type !== "Project" ? <span className="block truncate text-xs text-muted-foreground">{result.subtitle}</span> : null}</span><span className="ml-auto text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{result.type}</span></Link>; }) : <div className="px-3 py-6 text-center text-sm text-muted-foreground">No projects, materials, or storage found.</div>}
      </div> : null}
    </div>
    </>
  );
}
