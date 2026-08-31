"use client"

import Image from "next/image"
import { Camera } from "lucide-react"
import { useEffect, useState } from "react"

import { useInventory } from "@/features/inventory/components/inventory-provider"
import type { PhotoRecord } from "@/features/inventory/domain/inventory"
import { cn } from "@/lib/utils"

function PrivatePhoto({
  record,
  index,
  altPrefix,
}: {
  record: PhotoRecord
  index: number
  altPrefix: string
}) {
  const { getPhoto } = useInventory()
  const [url, setUrl] = useState("")
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading")

  useEffect(() => {
    let active = true
    let objectUrl = ""

    void getPhoto(record.blobKey)
      .then((blob) => {
        if (!active) return
        if (!blob) {
          setState("unavailable")
          return
        }
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
        setState("ready")
      })
      .catch(() => {
        if (active) setState("unavailable")
      })

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [getPhoto, record.blobKey])

  const alt = `${altPrefix} ${index + 1}: ${record.fileName}`

  return (
    <figure className="min-w-0 overflow-hidden rounded-xl border bg-muted/25">
      <div className="relative aspect-square overflow-hidden bg-muted/45">
        {state === "ready" ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="group block size-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            aria-label={`Open full-size ${alt.toLowerCase()}`}
          >
            <Image
              src={url}
              alt={alt}
              fill
              sizes="(max-width: 639px) 45vw, 13rem"
              unoptimized
              className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            />
          </a>
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 px-3 text-center text-xs text-muted-foreground" role="status">
            <Camera aria-hidden="true" className="size-5" />
            {state === "loading" ? "Loading photo…" : "Photo unavailable"}
          </div>
        )}
      </div>
      <figcaption className="p-2.5">
        <p className="truncate text-xs font-medium">{record.fileName}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {record.caption || record.type}
        </p>
      </figcaption>
    </figure>
  )
}

export function PrivatePhotoGallery({
  records,
  altPrefix,
  className,
}: {
  records: PhotoRecord[]
  altPrefix: string
  className?: string
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3", className)}>
      {records.map((record, index) => (
        <PrivatePhoto key={record.id} record={record} index={index} altPrefix={altPrefix} />
      ))}
    </div>
  )
}
