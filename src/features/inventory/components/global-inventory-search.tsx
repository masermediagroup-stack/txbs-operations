"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Search } from "lucide-react"
import type { InventorySearchResult } from "@/features/inventory/types/inventory"
import { useMobileSync } from "@/features/mobile/components/mobile-sync-provider"
import { IndexedDbInventoryPersistence } from "@/features/inventory/repositories/indexeddb-inventory-persistence"
import { inventorySearchRecords } from "@/features/inventory/domain/inventory-search"
import { inventorySeed } from "@/features/inventory/data/seed-data"

export function GlobalInventorySearch() {
  const {operator,scope,isOnline}=useMobileSync()
  const input=useRef<HTMLInputElement>(null)
  const container=useRef<HTMLDivElement>(null)
  const [query,setQuery]=useState("")
  const [open,setOpen]=useState(false)
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState("")
  const [results,setResults]=useState<InventorySearchResult[]>([])
  useEffect(()=>{
    const controller=new AbortController()
    const timer=setTimeout(async()=>{
      setError("")
      if (!query.trim()) {setResults([]);setLoading(false);return}
      setLoading(true)
      try {
        if (operator && isOnline) {
          const response=await fetch(`/api/inventory/search?q=${encodeURIComponent(query)}`,{cache:"no-store",signal:controller.signal})
          if (!response.ok) throw new Error("Search unavailable. Reconnect or sign in again.")
          const data=await response.json() as InventorySearchResult[]
          if (!controller.signal.aborted) setResults(data)
        } else {
          const persistence=new IndexedDbInventoryPersistence(scope)
          const snapshot=operator ? await persistence.requirePreparedSnapshot() : await persistence.load(inventorySeed)
          if (!controller.signal.aborted) setResults(inventorySearchRecords(snapshot,query))
        }
      } catch (cause) {
        if (!controller.signal.aborted) {setResults([]);setError(cause instanceof Error ? cause.message : "Search is unavailable.")}
      } finally {if (!controller.signal.aborted) setLoading(false)}
    },150)
    return ()=>{clearTimeout(timer);controller.abort()}
  },[query,operator,scope,isOnline])
  useEffect(()=>{
    const shortcut=(event:KeyboardEvent)=>{if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase()==="m") {event.preventDefault();input.current?.focus();setOpen(true)}}
    window.addEventListener("keydown",shortcut)
    return ()=>window.removeEventListener("keydown",shortcut)
  },[])
  return <>
    <Link href="/inventory#inventory-project-search" aria-label="Search inventory" className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:ring-2 lg:hidden"><Search aria-hidden="true" className="size-4" /></Link>
    <div ref={container} className="relative hidden lg:block" role="search" onBlur={(event)=>{if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)}} onKeyDown={(event)=>{
      const links=Array.from(container.current?.querySelectorAll<HTMLAnchorElement>("nav a") ?? [])
      const index=links.indexOf(document.activeElement as HTMLAnchorElement)
      if (event.key==="Escape") {input.current?.focus();setOpen(false)}
      if (event.key==="ArrowDown" && links.length) {event.preventDefault();links[Math.min(index+1,links.length-1)].focus()}
      if (event.key==="ArrowUp") {event.preventDefault();if (index<=0) input.current?.focus();else links[index-1].focus()}
    }}>
      <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <input ref={input} type="search" autoComplete="off" value={query} onChange={(event)=>{setQuery(event.target.value);setResults([]);setLoading(Boolean(event.target.value.trim()));setOpen(true)}} onFocus={()=>setOpen(true)} placeholder="Search inventory" aria-label="Search inventory" aria-controls={open && query.trim() ? "global-search-results" : undefined} className="h-11 w-64 rounded-lg border bg-card pr-3 pl-9 text-sm outline-none focus:ring-2 focus:ring-ring" />
      {open && query.trim() ? <nav id="global-search-results" aria-label="Inventory search results" className="absolute top-12 right-0 z-50 w-96 rounded-xl border bg-popover p-2 shadow-xl">
        {loading ? <p role="status" className="p-4 text-sm">Searching inventory…</p> : error ? <p role="alert" className="p-4 text-sm text-destructive">{error}</p> : results.length ? results.map((result)=><Link key={result.type+result.id} href={result.href} className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={()=>{setOpen(false);setQuery("")}}><span className="truncate text-sm font-medium">{result.title}</span><span className="shrink-0 text-xs text-muted-foreground">{result.type}</span></Link>) : <p role="status" className="p-4 text-sm text-muted-foreground">No matching inventory records.</p>}
      </nav> : null}
    </div>
  </>
}
