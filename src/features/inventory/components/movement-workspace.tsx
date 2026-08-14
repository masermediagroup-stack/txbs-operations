"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronRight,
  MoveRight,
  PackageOpen,
  RotateCcw,
  Search,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useInventory } from "@/features/inventory/components/inventory-provider";
import { RecordIssueSheet } from "@/features/inventory/components/issue-actions";
import {
  positionPrecisions,
  type InventorySnapshot,
  type MaterialLot,
  type MaterialMovement,
  type PositionPrecision,
} from "@/features/inventory/domain/inventory";
import { describePosition } from "@/features/inventory/domain/selectors";
import { useMobileSync } from "@/features/mobile/components/mobile-sync-provider";

const formatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function files(form: FormData, name: string) {
  return form.getAll(name).filter((item): item is File => item instanceof File && item.size > 0);
}

function locationName(
  snapshot: ReturnType<typeof useInventory>["snapshot"],
  id: string | null,
) {
  return (
    snapshot.locations.find((location) => location.id === id)?.name ??
    "Unknown location"
  );
}

function materialName(
  snapshot: ReturnType<typeof useInventory>["snapshot"],
  lot: MaterialLot,
) {
  return (
    snapshot.groups.find((group) => group.id === lot.groupId)?.name ??
    "Material lot"
  );
}

function MovementDetailSheet({
  movement,
  snapshot,
  reversed,
}: {
  movement: MaterialMovement;
  snapshot: InventorySnapshot;
  reversed: boolean;
}) {
  const lines = snapshot.movementLines.filter(
    (line) => line.movementId === movement.id,
  );
  const lineDetails = lines.map((line) => {
    const lot =
      snapshot.lots.find((item) => item.id === line.sourceLotId) ??
      snapshot.lots.find((item) => item.id === line.resultingLotId);
    const group = lot
      ? snapshot.groups.find((item) => item.id === lot.groupId)
      : null;
    const project = lot
      ? snapshot.projects.find((item) => item.id === lot.projectId)
      : null;

    return { line, lot, group, project };
  });
  const projectNames = [
    ...new Set(
      lineDetails.map(({ project }) => project?.name ?? "Unknown project"),
    ),
  ];
  const materialNames = [
    ...new Set(
      lineDetails.map(({ group }) => group?.name ?? "Material lot"),
    ),
  ];
  const movementPhotos = snapshot.photos.filter((photo) => photo.movementId === movement.id);

  return (
    <Sheet>
      <SheetTrigger
        render={
          <button
            type="button"
            className="group relative min-w-0 w-full rounded-xl p-4 pb-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            aria-label={`View movement details for ${movement.reason}`}
          />
        }
      >
        <div className="min-w-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 pr-20">
              <Badge
                variant={movement.kind === "Reversal" ? "secondary" : "outline"}
              >
                {movement.kind}
              </Badge>
              <h3 className="font-semibold">{movement.reason}</h3>
            </div>
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 rounded-lg bg-muted/55 p-3">
              <div>
                <p className="text-xs text-muted-foreground">From</p>
                <p className="truncate font-medium">
                  {[
                    ...new Set(
                      lines.map((line) =>
                        locationName(snapshot, line.sourceLocationId),
                      ),
                    ),
                  ].join(", ")}
                </p>
              </div>
              <ArrowRight aria-hidden="true" className="text-brand-orange" />
              <div className="text-right">
                <p className="text-xs text-muted-foreground">To</p>
                <p className="truncate font-medium">
                  {[
                    ...new Set(
                      lines.map((line) =>
                        locationName(snapshot, line.destinationLocationId),
                      ),
                    ),
                  ].join(", ")}
                </p>
              </div>
            </div>
            <p className="mt-3 truncate text-xs font-medium text-foreground sm:pr-64">
              {projectNames.join(", ")} · {materialNames.join(", ")}
            </p>
            <p className="mt-2 text-xs text-muted-foreground sm:pr-64">
              {lines.length} lot{lines.length === 1 ? "" : "s"} ·{" "}
              {formatter.format(new Date(movement.occurredAt))} ·{" "}
              {movement.operatorName}
              {movement.note ? ` · ${movement.note}` : ""}
              {movementPhotos.length
                ? ` · ${movementPhotos.length} photo${movementPhotos.length === 1 ? "" : "s"} attached`
                : ""}
            </p>
          </div>
          <span className="absolute top-4 right-4 inline-flex shrink-0 items-center gap-1 text-xs font-medium text-brand-blue">
            Details
            <ChevronRight
              aria-hidden="true"
              className="size-4 transition-transform group-hover:translate-x-0.5"
            />
          </span>
        </div>
      </SheetTrigger>
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
        <SheetHeader className="relative border-b">
          <span
            aria-hidden="true"
            className="absolute inset-x-0 -bottom-px h-1 bg-brand-orange"
          />
          <SheetTitle>Movement details</SheetTitle>
          <SheetDescription>
            {movement.kind} recorded{" "}
            {formatter.format(new Date(movement.occurredAt))} by{" "}
            {movement.operatorName}.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="flex flex-col gap-5">
            <section
              aria-labelledby={`movement-summary-${movement.id}`}
              className="rounded-xl border bg-muted/20 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    movement.kind === "Reversal" ? "secondary" : "outline"
                  }
                >
                  {movement.kind}
                </Badge>
                {reversed ? <Badge variant="secondary">Reversed</Badge> : null}
                {movementPhotos.length ? (
                  <Badge variant="outline">{movementPhotos.length} photo{movementPhotos.length === 1 ? "" : "s"} attached</Badge>
                ) : null}
              </div>
              <h3
                id={`movement-summary-${movement.id}`}
                className="mt-3 font-semibold"
              >
                {movement.reason}
              </h3>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Operator</dt>
                  <dd className="font-medium">{movement.operatorName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Recorded</dt>
                  <dd className="font-medium">
                    {formatter.format(new Date(movement.occurredAt))}
                  </dd>
                </div>
                {movement.note ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-muted-foreground">
                      Movement note
                    </dt>
                    <dd>{movement.note}</dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <section aria-labelledby={`movement-material-${movement.id}`}>
              <div className="mb-3 flex items-center gap-2">
                <PackageOpen
                  aria-hidden="true"
                  className="size-5 text-brand-blue"
                />
                <h3
                  id={`movement-material-${movement.id}`}
                  className="font-semibold"
                >
                  Material moved
                </h3>
                <Badge variant="secondary">{lines.length}</Badge>
              </div>
              <div className="flex flex-col gap-3">
                {lines.map((line, index) => {
                  const lot =
                    snapshot.lots.find(
                      (item) => item.id === line.sourceLotId,
                    ) ??
                    snapshot.lots.find(
                      (item) => item.id === line.resultingLotId,
                    );
                  const group = lot
                    ? snapshot.groups.find((item) => item.id === lot.groupId)
                    : null;
                  const project = lot
                    ? snapshot.projects.find(
                        (item) => item.id === lot.projectId,
                      )
                    : null;
                  return (
                    <article key={line.id} className="rounded-xl border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {project?.name ?? "Unknown project"}
                          </p>
                          <h4 className="mt-1 font-semibold">
                            {group?.name ?? "Material lot"}
                          </h4>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {line.quantity ?? "Unknown"}{" "}
                          {lot?.packageType ?? "packages"}
                        </Badge>
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
                        <div className="rounded-lg bg-muted/55 p-3">
                          <p className="text-xs text-muted-foreground">From</p>
                          <p className="font-medium">
                            {locationName(snapshot, line.sourceLocationId)}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {describePosition(line.sourcePosition)}
                          </p>
                        </div>
                        <ArrowRight
                          aria-hidden="true"
                          className="mx-auto size-5 rotate-90 text-brand-orange sm:rotate-0"
                        />
                        <div className="rounded-lg bg-muted/55 p-3 sm:text-right">
                          <p className="text-xs text-muted-foreground">To</p>
                          <p className="font-medium">
                            {locationName(snapshot, line.destinationLocationId)}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {describePosition(line.destinationPosition)}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Movement line {index + 1} of {lines.length}
                      </p>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ReverseMovementSheet({
  movementId,
  disabled,
}: {
  movementId: string;
  disabled: boolean;
}) {
  const { reverseMovement } = useInventory();
  const [open, setOpen] = useState(false);
  const [operatorName, setOperatorName] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await reverseMovement({
        movementId,
        operatorName,
        note,
        clientMutationId: crypto.randomUUID(),
      });
      setOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Movement could not be reversed.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (disabled) return <Badge variant="secondary">Reversed</Badge>;
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button size="sm" variant="outline" />}>
        <RotateCcw aria-hidden="true" data-icon="inline-start" />
        Reverse
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Reverse movement</SheetTitle>
          <SheetDescription>
            Return the moved lots to their recorded sources with a new immutable
            history event.
          </SheetDescription>
        </SheetHeader>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
          <div className="flex-1 overflow-y-auto p-4">
            <FieldGroup>
              <Alert>
                <AlertTriangle aria-hidden="true" />
                <AlertTitle>Current-state check required</AlertTitle>
                <AlertDescription>
                  Reversal stops if any resulting lot has moved or changed since
                  this event.
                </AlertDescription>
              </Alert>
              <Field>
                <FieldLabel htmlFor={`reversal-note-${movementId}`}>
                  Correction note
                </FieldLabel>
                <Textarea
                  id={`reversal-note-${movementId}`}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Why is this movement being reversed?"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`reversal-operator-${movementId}`}>
                  Operator name
                </FieldLabel>
                <Input
                  id={`reversal-operator-${movementId}`}
                  value={operatorName}
                  onChange={(event) => setOperatorName(event.target.value)}
                  required
                  autoComplete="name"
                />
              </Field>
              {error ? <FieldError>{error}</FieldError> : null}
            </FieldGroup>
          </div>
          <SheetFooter className="border-t">
            <Button type="submit" size="lg" disabled={saving}>
              {saving ? "Reversing…" : "Reverse movement"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function MovementWorkspace() {
  const { isOnline } = useMobileSync();
  const { snapshot, moveMaterial } = useInventory();
  const searchParams = useSearchParams();
  const initialLotId = searchParams.get("lot");
  const initialLot = snapshot.lots.find(
    (lot) => lot.presence === "Present" && lot.id === initialLotId,
  );
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    initialLotId ? { [initialLotId]: true } : {},
  );
  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    initialLot
      ? {
          [initialLot.id]:
            initialLot.quantity === null ? "" : String(initialLot.quantity),
        }
      : {},
  );
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [mobileLimit, setMobileLimit] = useState(10);
  const [destinationQuery, setDestinationQuery] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [precision, setPrecision] = useState<PositionPrecision>("General");
  const [row, setRow] = useState("");
  const [column, setColumn] = useState("");
  const [positionNote, setPositionNote] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeLots = useMemo(
    () => snapshot.lots.filter((lot) => lot.presence === "Present"),
    [snapshot.lots],
  );

  const filteredLots = activeLots.filter((lot) => {
    const group = snapshot.groups.find((item) => item.id === lot.groupId);
    const project = snapshot.projects.find((item) => item.id === lot.projectId);
    const haystack =
      `${group?.name ?? ""} ${project?.name ?? ""} ${locationName(snapshot, lot.locationId)}`.toLowerCase();
    return (
      (!query.trim() || haystack.includes(query.trim().toLowerCase())) &&
      (!projectFilter || lot.projectId === projectFilter) &&
      (!sourceFilter || lot.locationId === sourceFilter)
    );
  });
  const selectedLots = activeLots.filter((lot) => selected[lot.id]);
  const handlingRequirements = [
    ...new Set(selectedLots.flatMap((lot) => lot.handlingRequirements)),
  ];
  const destinationLocations = snapshot.locations.filter(
    (location) =>
      !destinationQuery.trim() ||
      `${location.name} ${location.zone}`
        .toLowerCase()
        .includes(destinationQuery.trim().toLowerCase()),
  );
  const movements = snapshot.movements.toSorted(
    (a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt),
  );

  function toggle(lot: MaterialLot, checked: boolean) {
    setSelected((current) => ({ ...current, [lot.id]: checked }));
    setQuantities((current) => ({
      ...current,
      [lot.id]:
        checked && current[lot.id] === undefined
          ? lot.quantity === null
            ? ""
            : String(lot.quantity)
          : (current[lot.id] ?? ""),
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const evidence = files(form, "movementPhoto");
    try {
      if (evidence.length > 3) throw new Error("Select no more than 3 movement photos.");
      await moveMaterial({
        operatorName,
        reason,
        note,
        clientMutationId: crypto.randomUUID(),
        locationId: destinationId,
        precision,
        row: (row || null) as "Front" | "Middle" | "Back" | null,
        column: (column || null) as "Left" | "Center" | "Right" | null,
        positionNote,
        files: evidence,
        photoType: "Location",
        lines: selectedLots.map((lot) => ({
          lotId: lot.id,
          quantity:
            lot.quantity === null
              ? null
              : Number(quantities[lot.id] ?? lot.quantity),
          expectedVersion: lot.version,
        })),
      });
      setMessage(isOnline
        ? `${selectedLots.length} material lot${selectedLots.length === 1 ? "" : "s"} moved and recorded.`
        : `${selectedLots.length} material lot${selectedLots.length === 1 ? "" : "s"} saved on this device and queued for shared sync.`);
      setSelected({});
      setQuantities({});
      setReason("");
      setNote("");
      const photoInput = formElement.elements.namedItem("movementPhoto");
      if (photoInput instanceof HTMLInputElement) photoInput.value = "";
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Material could not be moved.",
      );
    } finally {
      setSaving(false);
    }
  }

  function selectionCells(lot: MaterialLot, suffix: string) {
    const checkboxId = `move-${suffix}-${lot.id}`;
    const quantityId = `quantity-${suffix}-${lot.id}`;
    return {
      select: (
        <label
          htmlFor={checkboxId}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 font-medium"
        >
          <input
            id={checkboxId}
            type="checkbox"
            className="size-4"
            checked={Boolean(selected[lot.id])}
            onChange={(event) => toggle(lot, event.target.checked)}
          />
          Select
        </label>
      ),
      quantity:
        lot.quantity === null ? (
          <span className="text-xs text-muted-foreground">
            Full lot · quantity unknown
          </span>
        ) : (
          <Field className="gap-1">
            <FieldLabel htmlFor={quantityId}>Quantity to move</FieldLabel>
            <Input
              id={quantityId}
              type="number"
              min="1"
              max={lot.quantity}
              step="1"
              inputMode="numeric"
              disabled={!selected[lot.id]}
              value={quantities[lot.id] ?? String(lot.quantity)}
              onChange={(event) =>
                setQuantities((current) => ({
                  ...current,
                  [lot.id]: event.target.value,
                }))
              }
            />
          </Field>
        ),
    };
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHeader
        eyebrow="Inventory"
        title="Material movements"
        description="Move complete or partial material lots while preserving source history and quantity."
      />
      <form onSubmit={submit} className="flex min-w-0 flex-col gap-6">
        <Card>
          <CardHeader className="relative border-b">
            <span
              aria-hidden="true"
              className="absolute inset-x-0 -bottom-px h-1 bg-brand-orange"
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-xl">
                  Plan a material movement
                </CardTitle>
                <CardDescription>
                  Select active lots, confirm one destination, and record who
                  completed the move.
                </CardDescription>
              </div>
              <Badge variant="secondary">{selectedLots.length} selected</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem_14rem]">
              <Field>
                <FieldLabel htmlFor="movement-search">Find material</FieldLabel>
                <div className="relative">
                  <Search
                    aria-hidden="true"
                    className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="movement-search"
                    className="pl-9"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Project, material, or location"
                  />
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="movement-project">Project</FieldLabel>
                <NativeSelect
                  className="w-full"
                  id="movement-project"
                  value={projectFilter}
                  onChange={(event) => setProjectFilter(event.target.value)}
                >
                  <NativeSelectOption value="">All projects</NativeSelectOption>
                  {snapshot.projects.map((project) => (
                    <NativeSelectOption key={project.id} value={project.id}>
                      {project.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="movement-source">
                  Current location
                </FieldLabel>
                <NativeSelect
                  className="w-full"
                  id="movement-source"
                  value={sourceFilter}
                  onChange={(event) => setSourceFilter(event.target.value)}
                >
                  <NativeSelectOption value="">
                    All locations
                  </NativeSelectOption>
                  {snapshot.locations.map((location) => (
                    <NativeSelectOption key={location.id} value={location.id}>
                      {location.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>

            <div className="hidden overflow-x-auto rounded-lg border lg:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/65 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Material</th>
                    <th className="px-3 py-2 font-medium">Project</th>
                    <th className="px-3 py-2 font-medium">Current position</th>
                    <th className="px-3 py-2 font-medium">Available</th>
                    <th className="px-3 py-2 font-medium">Move</th>
                    <th className="px-3 py-2 font-medium">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLots.map((lot) => {
                    const project = snapshot.projects.find(
                      (item) => item.id === lot.projectId,
                    );
                    const cells = selectionCells(lot, "desktop");
                    return (
                      <tr key={lot.id} className="border-t align-middle">
                        <td className="px-3 py-3 font-medium">
                          {materialName(snapshot, lot)}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {project?.name}
                        </td>
                        <td className="px-3 py-3">
                          <span className="block">
                            {locationName(snapshot, lot.locationId)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {describePosition(lot.position)}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-mono tabular-nums">
                          {lot.quantity ?? "Unknown"} {lot.packageType}
                        </td>
                        <td className="px-3 py-3">{cells.select}</td>
                        <td className="min-w-40 px-3 py-3">{cells.quantity}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 lg:hidden">
              {filteredLots.slice(0, mobileLimit).map((lot) => {
                const project = snapshot.projects.find(
                  (item) => item.id === lot.projectId,
                );
                const cells = selectionCells(lot, "mobile");
                return (
                  <article key={lot.id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">
                          {materialName(snapshot, lot)}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {project?.name}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {lot.quantity ?? "Unknown"} {lot.packageType}
                      </Badge>
                    </div>
                    <div className="my-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg bg-muted/55 p-3 text-xs">
                      <span data-testid="lot-current-location">
                        {locationName(snapshot, lot.locationId)}
                      </span>
                      <ArrowRight
                        aria-hidden="true"
                        className="text-brand-orange"
                      />
                      <span className="text-right text-muted-foreground">
                        Choose below
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {cells.select}
                      {cells.quantity}
                    </div>
                  </article>
                );
              })}
              {filteredLots.length > mobileLimit ? (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => setMobileLimit((current) => current + 10)}
                >
                  Show 10 more lots
                </Button>
              ) : null}
            </div>
            {!filteredLots.length ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No active material lots match these filters.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,.72fr)]">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <MoveRight aria-hidden="true" />
                Destination and evidence
              </CardTitle>
              <CardDescription>
                Every selected lot uses this destination; exact position applies
                to each resulting lot.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="destination-search">
                    Search destinations
                  </FieldLabel>
                  <Input
                    id="destination-search"
                    value={destinationQuery}
                    onChange={(event) =>
                      setDestinationQuery(event.target.value)
                    }
                    placeholder="Conex, yard, or receiving area"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="destination">
                    Destination location
                  </FieldLabel>
                  <NativeSelect
                    className="w-full [&_select]:h-11"
                    id="destination"
                    value={destinationId}
                    onChange={(event) => setDestinationId(event.target.value)}
                    required
                  >
                    <NativeSelectOption value="">
                      Select destination
                    </NativeSelectOption>
                    {destinationLocations.map((location) => (
                      <NativeSelectOption key={location.id} value={location.id}>
                        {location.name} · {location.zone}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <div className="grid grid-cols-3 gap-3">
                  <Field className="min-w-0">
                    <FieldLabel htmlFor="movement-precision">
                      Position
                    </FieldLabel>
                    <NativeSelect
                      className="w-full min-w-0 [&_select]:h-11"
                      id="movement-precision"
                      value={precision}
                      onChange={(event) =>
                        setPrecision(event.target.value as PositionPrecision)
                      }
                    >
                      {positionPrecisions.map((item) => (
                        <NativeSelectOption key={item}>
                          {item}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field className="min-w-0">
                    <FieldLabel htmlFor="movement-depth">Depth</FieldLabel>
                    <NativeSelect
                      className="w-full min-w-0 [&_select]:h-11"
                      id="movement-depth"
                      value={row}
                      onChange={(event) => setRow(event.target.value)}
                      disabled={precision !== "Exact"}
                    >
                      <NativeSelectOption value="">Not set</NativeSelectOption>
                      {["Front", "Middle", "Back"].map((item) => (
                        <NativeSelectOption key={item}>
                          {item}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field className="min-w-0">
                    <FieldLabel htmlFor="movement-side">Side</FieldLabel>
                    <NativeSelect
                      className="w-full min-w-0 [&_select]:h-11"
                      id="movement-side"
                      value={column}
                      onChange={(event) => setColumn(event.target.value)}
                      disabled={precision !== "Exact"}
                    >
                      <NativeSelectOption value="">Not set</NativeSelectOption>
                      {["Left", "Center", "Right"].map((item) => (
                        <NativeSelectOption key={item}>
                          {item}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="movement-position-note">
                    Position note
                  </FieldLabel>
                  <Input
                    id="movement-position-note"
                    value={positionNote}
                    onChange={(event) => setPositionNote(event.target.value)}
                    placeholder="Aisle, stack, landmark, or access note"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="movement-reason">
                    Movement reason
                  </FieldLabel>
                  <Input
                    id="movement-reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    required
                    placeholder="Why is this material moving?"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="movement-note">Movement note</FieldLabel>
                  <Textarea
                    id="movement-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="movement-photo">
                    <Camera aria-hidden="true" />
                    Proof photo
                  </FieldLabel>
                  <Input
                    id="movement-photo"
                    name="movementPhoto"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                  />
                  <FieldDescription>Optional. Select up to 3 photos.</FieldDescription>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
          <aside>
            <Card className="xl:sticky xl:top-20">
              <CardHeader className="border-b">
                <CardTitle>Confirm movement</CardTitle>
                <CardDescription>
                  Review restrictions before material leaves its current
                  position.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  {handlingRequirements.length ? (
                    <Alert>
                      <AlertTriangle aria-hidden="true" />
                      <AlertTitle>Handling requirements</AlertTitle>
                      <AlertDescription>
                        {handlingRequirements.join(" · ")}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <p className="rounded-lg bg-muted/55 p-3 text-sm text-muted-foreground">
                      Selected lot handling requirements will appear here.
                    </p>
                  )}
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border p-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Sources</p>
                      <p className="font-mono text-xl font-semibold tabular-nums">
                        {
                          new Set(selectedLots.map((lot) => lot.locationId))
                            .size
                        }
                      </p>
                    </div>
                    <ArrowRight
                      aria-hidden="true"
                      className="text-brand-orange"
                    />
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        Destination
                      </p>
                      <p className="truncate font-medium">
                        {destinationId
                          ? locationName(snapshot, destinationId)
                          : "Not selected"}
                      </p>
                    </div>
                  </div>
                  <Field>
                    <FieldLabel htmlFor="movement-operator">
                      Operator name
                    </FieldLabel>
                    <Input
                      id="movement-operator"
                      value={operatorName}
                      onChange={(event) => setOperatorName(event.target.value)}
                      required
                      autoComplete="name"
                    />
                    <FieldDescription>
                      Recorded with the authenticated account and preserved as movement evidence.
                    </FieldDescription>
                  </Field>
                  {error ? <FieldError>{error}</FieldError> : null}
                  {message ? (
                    <Alert>
                      <CheckCircle2 aria-hidden="true" />
                      <AlertTitle>Movement recorded</AlertTitle>
                      <AlertDescription>{message}</AlertDescription>
                    </Alert>
                  ) : null}
                  <div className="sticky bottom-2 z-20 rounded-xl bg-card pt-1">
                    <Button
                      type="submit"
                      size="lg"
                      className="h-11 w-full shadow-sm"
                      disabled={
                        saving || !selectedLots.length || !destinationId
                      }
                    >
                      {saving
                        ? "Moving material…"
                        : `Move ${selectedLots.length || "selected"} lot${selectedLots.length === 1 ? "" : "s"}`}
                    </Button>
                  </div>
                </FieldGroup>
              </CardContent>
            </Card>
          </aside>
        </div>
      </form>

      <Card>
        <CardHeader className="border-b-0 sm:border-b">
          <CardTitle>Movement history</CardTitle>
          <CardDescription>
            Select a movement to review its project, material, quantity, and
            recorded locations.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {movements.length ? (
            movements.map((movement) => {
              const reversed = snapshot.movements.some(
                (item) => item.reversalOfMovementId === movement.id,
              );
              return (
                <article
                  key={movement.id}
                  className="relative overflow-hidden rounded-xl border transition-colors hover:bg-muted/35 focus-within:bg-muted/35"
                >
                  <div className="flex flex-col">
                    <MovementDetailSheet
                      movement={movement}
                      snapshot={snapshot}
                      reversed={reversed}
                    />
                    <div className="flex shrink-0 flex-wrap justify-end gap-2 px-4 pb-4 sm:absolute sm:right-0 sm:bottom-0">
                      {movement.kind === "Move" ? (
                        <ReverseMovementSheet
                          movementId={movement.id}
                          disabled={reversed}
                        />
                      ) : null}
                      <RecordIssueSheet movementId={movement.id} size="sm" />
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No material movements have been recorded on this device.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
