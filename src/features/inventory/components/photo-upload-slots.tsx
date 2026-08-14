"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, Plus, X } from "lucide-react";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type PhotoUploadSlotsProps = {
  id: string;
  name: string;
  label: string;
  description: string;
  existingCount?: number;
  className?: string;
};

type SelectedPhoto = { file: File; previewUrl: string };

export function PhotoUploadSlots({
  id,
  name,
  label,
  description,
  existingCount = 0,
  className,
}: PhotoUploadSlotsProps) {
  const savedCount = Math.min(existingCount, 3);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [selected, setSelected] = useState<Array<SelectedPhoto | null>>(() =>
    Array(3 - savedCount).fill(null),
  );
  const selectedRef = useRef(selected);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  useEffect(
    () => () => {
      selectedRef.current.forEach((photo) => {
        if (photo) URL.revokeObjectURL(photo.previewUrl);
      });
    },
    [],
  );

  function selectPhoto(index: number, file: File | undefined) {
    setSelected((current) =>
      current.map((photo, itemIndex) => {
        if (itemIndex !== index) return photo;
        if (photo) URL.revokeObjectURL(photo.previewUrl);
        return file ? { file, previewUrl: URL.createObjectURL(file) } : null;
      }),
    );
  }

  function removePhoto(index: number) {
    const input = inputRefs.current[index];
    if (input) input.value = "";
    selectPhoto(index, undefined);
  }

  return (
    <Field className={className}>
      <FieldLabel id={`${id}-label`} className="flex items-center gap-2">
        <Camera aria-hidden="true" />
        {label}
      </FieldLabel>
      <div
        className="grid max-w-[22rem] grid-cols-3 gap-2"
        role="group"
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-description`}
      >
        {Array.from({ length: savedCount }, (_, index) => (
          <div
            key={`saved-${index}`}
            className="flex aspect-square min-w-0 flex-col items-center justify-center gap-1 rounded-xl border bg-muted/55 text-center text-xs font-medium text-muted-foreground"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-background text-primary">
              <Check aria-hidden="true" className="size-5" />
            </span>
            Saved photo {index + 1}
          </div>
        ))}
        {selected.map((photo, index) => {
          const slotNumber = savedCount + index + 1;
          const inputId = `${id}-${slotNumber}`;
          return (
            <div
              key={inputId}
              className="relative aspect-square min-w-0 overflow-hidden rounded-xl border bg-background"
            >
              <input
                ref={(input) => {
                  inputRefs.current[index] = input;
                }}
                id={inputId}
                name={name}
                type="file"
                accept="image/*"
                className="peer sr-only"
                onChange={(event) =>
                  selectPhoto(index, event.target.files?.[0])
                }
                aria-label={`${photo ? "Replace" : "Add"} ${label.toLowerCase()} ${slotNumber} of 3`}
              />
              {photo ? (
                <>
                  {/* Blob previews are local-only and are not eligible for Next Image optimization. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.previewUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                  <label
                    htmlFor={inputId}
                    className="absolute inset-0 cursor-pointer rounded-xl ring-inset peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
                  >
                    <span className="sr-only">
                      Replace {label.toLowerCase()} {slotNumber}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-1.5 right-1.5 z-10 inline-flex size-8 items-center justify-center rounded-full bg-background/95 text-foreground shadow-sm outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Remove ${label.toLowerCase()} ${slotNumber}`}
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </>
              ) : (
                <label
                  htmlFor={inputId}
                  className="flex size-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-transparent px-2 text-center text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/55 hover:text-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary/8 text-primary">
                    {slotNumber === 1 ? (
                      <Camera aria-hidden="true" className="size-5" />
                    ) : (
                      <Plus aria-hidden="true" className="size-5" />
                    )}
                  </span>
                  Add photo {slotNumber}
                </label>
              )}
            </div>
          );
        })}
      </div>
      <FieldDescription
        id={`${id}-description`}
        className={cn(
          "max-w-[22rem]",
          savedCount === 3 && "font-medium text-foreground",
        )}
      >
        {savedCount === 3 ? "Three photos are already saved." : description}
      </FieldDescription>
    </Field>
  );
}
