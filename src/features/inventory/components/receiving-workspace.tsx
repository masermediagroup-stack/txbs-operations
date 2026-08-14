"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  PackagePlus,
  Save,
  Trash2,
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
import { Textarea } from "@/components/ui/textarea";
import { useInventory } from "@/features/inventory/components/inventory-provider";
import { RecordIssueSheet } from "@/features/inventory/components/issue-actions";
import { PhotoUploadSlots } from "@/features/inventory/components/photo-upload-slots";
import {
  accessibilityStates,
  conditionStates,
  packageTypes,
  protectionStates,
} from "@/features/inventory/domain/inventory";
import { searchInventory } from "@/features/inventory/domain/selectors";
import type { ReceiptLineInput } from "@/features/inventory/services/inventory-service";
import { useMobileSync } from "@/features/mobile/components/mobile-sync-provider";

type LineState = Omit<ReceiptLineInput, "file"> & { key: string };

function emptyLine(key = `new-${Date.now()}`): LineState {
  return {
    key,
    materialName: "",
    description: "",
    packageType: "Pallet",
    quantity: null,
    condition: "Needs inspection",
    protection: "Unknown",
    accessibility: "Unknown",
    handlingRequirements: [],
    targetLocationId: null,
  };
}

function file(form: FormData, name: string) {
  const item = form.get(name);
  return item instanceof File && item.size ? item : null;
}
function files(form: FormData, name: string) {
  return form
    .getAll(name)
    .filter((item): item is File => item instanceof File && item.size > 0);
}

export function ReceivingWorkspace() {
  const { snapshot, saveReceiptDraft, completeReceipt } = useInventory();
  const { isOnline } = useMobileSync();
  const [receiptId, setReceiptId] = useState<string | undefined>();
  const [receiptNumber, setReceiptNumber] = useState("");
  const [projectId, setProjectId] = useState("");
  const [inspectionState, setInspectionState] = useState<
    "Pending" | "Passed" | "Exception"
  >("Pending");
  const [handwrittenProjectText, setHandwrittenProjectText] = useState("");
  const [labelApplied, setLabelApplied] = useState(false);
  const [stagingLocationId, setStagingLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [lines, setLines] = useState<LineState[]>([emptyLine("new-1")]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fileResetVersion, setFileResetVersion] = useState(0);
  const matches = useMemo(
    () =>
      handwrittenProjectText.trim().length >= 2
        ? searchInventory(snapshot, handwrittenProjectText).slice(0, 3)
        : [],
    [handwrittenProjectText, snapshot],
  );
  const duplicates = snapshot.receipts.filter(
    (receipt) =>
      receipt.receiptNumber &&
      receipt.receiptNumber.toLowerCase() ===
        receiptNumber.trim().toLowerCase() &&
      receipt.id !== receiptId,
  );
  const drafts = snapshot.receipts
    .filter((receipt) => receipt.status === "Draft")
    .toSorted((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

  function updateLine(key: string, update: Partial<LineState>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...update } : line)),
    );
  }
  function reset() {
    setReceiptId(undefined);
    setReceiptNumber("");
    setProjectId("");
    setInspectionState("Pending");
    setHandwrittenProjectText("");
    setLabelApplied(false);
    setStagingLocationId("");
    setNotes("");
    setLines([emptyLine()]);
    setMessage("");
    setError("");
    setFileResetVersion((current) => current + 1);
  }
  function resume(id: string) {
    const receipt = snapshot.receipts.find((item) => item.id === id);
    if (!receipt) return;
    const savedLines = snapshot.receiptLines.filter(
      (line) => line.receiptId === id,
    );
    setReceiptId(id);
    setReceiptNumber(receipt.receiptNumber);
    setProjectId(receipt.projectId ?? "");
    setInspectionState(receipt.inspectionState);
    setHandwrittenProjectText(receipt.handwrittenProjectText);
    setLabelApplied(receipt.physicalLabelApplied);
    setStagingLocationId(receipt.stagingLocationId ?? "");
    setNotes(receipt.notes);
    setLines(
      savedLines.map((line) => ({
        key: line.id,
        id: line.id,
        materialName: line.materialName,
        description: line.description,
        packageType: line.packageType,
        quantity: line.quantity,
        condition: line.condition,
        protection: line.protection,
        accessibility: line.accessibility,
        handlingRequirements: line.handlingRequirements,
        targetLocationId: line.targetLocationId,
      })),
    );
    setMessage(
      "Draft reopened. New photos will be added to the existing evidence.",
    );
    setError("");
    setFileResetVersion((current) => current + 1);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const intent =
      ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)
        ?.value ?? "save";
    try {
      if (intent === "receive") {
        const missingPhotoIndex = lines.findIndex(
          (line) =>
            !files(form, `linePhoto-${line.key}`).length &&
            !snapshot.receiptLines.find((savedLine) => savedLine.id === line.id)
              ?.photoIds.length,
        );
        if (missingPhotoIndex >= 0)
          throw new Error(
            `Add a material photo to receipt line ${missingPhotoIndex + 1} before receiving.`,
          );
      }
      const selectedLinePhotos = lines.map((line) =>
        files(form, `linePhoto-${line.key}`),
      );
      const selectedDocumentPhotos = files(form, "documentPhoto");
      const existingDocumentPhotos =
        snapshot.receipts.find((receipt) => receipt.id === receiptId)
          ?.documentPhotoIds.length ?? 0;
      if (selectedDocumentPhotos.length + existingDocumentPhotos > 3)
        throw new Error(
          "A receipt can have no more than 3 packing slip or document photos.",
        );
      const excessivePhotoIndex = selectedLinePhotos.findIndex(
        (selected, index) =>
          selected.length +
            (snapshot.receiptLines.find(
              (savedLine) => savedLine.id === lines[index].id,
            )?.photoIds.length ?? 0) >
          3,
      );
      if (excessivePhotoIndex >= 0)
        throw new Error(
          `Receipt line ${excessivePhotoIndex + 1} can have no more than 3 material photos.`,
        );
      const saved = await saveReceiptDraft({
        receiptId,
        siteId: snapshot.sites[0].id,
        receiptNumber,
        projectId: projectId || null,
        inspectionState,
        handwrittenProjectText,
        physicalLabelApplied: labelApplied,
        stagingLocationId: stagingLocationId || null,
        notes,
        operatorName,
        documentFiles: selectedDocumentPhotos,
        labelFile: file(form, "labelPhoto"),
        lines: lines.map((line, index) => ({
          ...line,
          id: line.id,
          files: selectedLinePhotos[index],
          photoType: "Material",
        })),
      });
      setReceiptId(saved.receiptId);
      setLines((current) =>
        current.map((line, index) => ({
          ...line,
          id: saved.lineIds[index],
          key: saved.lineIds[index],
        })),
      );
      if (intent === "receive") {
        await completeReceipt(saved.receiptId, operatorName);
        setMessage(
          !isOnline
            ? "Shipment saved on this device and queued for shared sync."
            : projectId
              ? "Shipment received. Material lots, verification, photos, and activity were created together."
              : "Unknown shipment preserved and an Unknown Shipment issue was created.",
        );
      } else
        setMessage(
          isOnline
            ? "Draft saved on this device. You can close the page and resume later."
            : "Draft saved on this device and queued for shared sync.",
        );
      formElement
        .querySelectorAll<HTMLInputElement>('input[type="file"]')
        .forEach((input) => {
          input.value = "";
        });
      setFileResetVersion((current) => current + 1);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Receiving could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHeader
        eyebrow="Inventory"
        title="Receiving"
        description="Identify, inspect, photograph, label, assign, review, and receive inbound material."
      />
      <Alert>
        <Camera aria-hidden="true" />
        <AlertTitle>Material photos are required to receive</AlertTitle>
        <AlertDescription>
          Add 1–3 material photos to every receipt line before completing
          Receiving. Drafts can be saved without photos; document, label, and
          all non-receiving photos remain optional.
        </AlertDescription>
      </Alert>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <form onSubmit={submit} className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck aria-hidden="true" />
                1. Identify shipment
              </CardTitle>
              <CardDescription>
                Match the project when evidence supports it; unresolved
                shipments remain valid receiving records.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="receiptNumber">
                      Receipt or packing-slip number
                    </FieldLabel>
                    <Input
                      id="receiptNumber"
                      value={receiptNumber}
                      onChange={(event) => setReceiptNumber(event.target.value)}
                    />
                    <FieldDescription>
                      Duplicates warn but never merge automatically.
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="projectId">Matched project</FieldLabel>
                    <NativeSelect
                      className="w-full"
                      id="projectId"
                      value={projectId}
                      onChange={(event) => setProjectId(event.target.value)}
                    >
                      <NativeSelectOption value="">
                        Unknown / unresolved shipment
                      </NativeSelectOption>
                      {snapshot.projects.map((project) => (
                        <NativeSelectOption key={project.id} value={project.id}>
                          {project.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="fieldLabel">
                    Handwritten project text
                  </FieldLabel>
                  <Input
                    id="fieldLabel"
                    value={handwrittenProjectText}
                    onChange={(event) =>
                      setHandwrittenProjectText(event.target.value)
                    }
                    placeholder="Enter exactly what appears on the shipment"
                  />
                  {matches.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {matches.map(({ project, explanation }) => (
                        <Button
                          key={project.id}
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setProjectId(project.id)}
                        >
                          {project.name}
                          {explanation ? ` · ${explanation}` : ""}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </Field>
                {duplicates.length ? (
                  <Alert>
                    <AlertTriangle aria-hidden="true" />
                    <AlertTitle>Possible duplicate receipt number</AlertTitle>
                    <AlertDescription>
                      {duplicates.length} existing record
                      {duplicates.length === 1 ? "" : "s"} use this number.
                      Review them before receiving; this draft remains separate.
                    </AlertDescription>
                  </Alert>
                ) : null}
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>2. Inspect and photograph</CardTitle>
              <CardDescription>
                Capture original receiving documents, material evidence, and
                exceptions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(18rem,1fr)]">
                  <Field>
                    <FieldLabel htmlFor="inspectionState">
                      Inspection result
                    </FieldLabel>
                    <NativeSelect
                      className="w-full"
                      id="inspectionState"
                      value={inspectionState}
                      onChange={(event) =>
                        setInspectionState(event.target.value as never)
                      }
                    >
                      {["Pending", "Passed", "Exception"].map((item) => (
                        <NativeSelectOption key={item}>
                          {item}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                  <PhotoUploadSlots
                    key={`${receiptId ?? "new"}-${snapshot.receipts.find((receipt) => receipt.id === receiptId)?.documentPhotoIds.length ?? 0}-${fileResetVersion}`}
                    id="documentPhoto"
                    name="documentPhoto"
                    label="Packing slip / document photos"
                    description="Optional. Add up to 3 photos."
                    existingCount={
                      snapshot.receipts.find(
                        (receipt) => receipt.id === receiptId,
                      )?.documentPhotoIds.length ?? 0
                    }
                  />
                </div>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>3. Record packages</CardTitle>
              <CardDescription>
                Unknown quantities stay unknown rather than becoming zero.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {lines.map((line, index) => (
                <fieldset
                  key={line.key}
                  className="flex flex-col gap-4 rounded-xl border p-4"
                >
                  <legend className="px-1 text-sm font-semibold">
                    Receipt line {index + 1}
                  </legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor={`material-${line.key}`}>
                        Material name
                      </FieldLabel>
                      <Input
                        id={`material-${line.key}`}
                        value={line.materialName}
                        onChange={(event) =>
                          updateLine(line.key, {
                            materialName: event.target.value,
                          })
                        }
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`package-${line.key}`}>
                        Package type
                      </FieldLabel>
                      <NativeSelect
                        className="w-full"
                        id={`package-${line.key}`}
                        value={line.packageType}
                        onChange={(event) =>
                          updateLine(line.key, {
                            packageType: event.target.value as never,
                          })
                        }
                      >
                        {packageTypes.map((item) => (
                          <NativeSelectOption key={item}>
                            {item}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field>
                      <FieldLabel htmlFor={`quantity-${line.key}`}>
                        Quantity
                      </FieldLabel>
                      <Input
                        id={`quantity-${line.key}`}
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        value={line.quantity ?? ""}
                        onChange={(event) =>
                          updateLine(line.key, {
                            quantity:
                              event.target.value === ""
                                ? null
                                : Number(event.target.value),
                          })
                        }
                      />
                      <FieldDescription>Blank means unknown.</FieldDescription>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`condition-${line.key}`}>
                        Condition
                      </FieldLabel>
                      <NativeSelect
                        className="w-full"
                        id={`condition-${line.key}`}
                        value={line.condition}
                        onChange={(event) =>
                          updateLine(line.key, {
                            condition: event.target.value as never,
                          })
                        }
                      >
                        {conditionStates.map((item) => (
                          <NativeSelectOption key={item}>
                            {item}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`target-${line.key}`}>
                        Storage assignment
                      </FieldLabel>
                      <NativeSelect
                        className="w-full"
                        id={`target-${line.key}`}
                        value={line.targetLocationId ?? ""}
                        onChange={(event) =>
                          updateLine(line.key, {
                            targetLocationId: event.target.value || null,
                          })
                        }
                      >
                        <NativeSelectOption value="">
                          Use receipt staging / unknown
                        </NativeSelectOption>
                        {snapshot.locations.map((location) => (
                          <NativeSelectOption
                            key={location.id}
                            value={location.id}
                          >
                            {location.name}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel htmlFor={`description-${line.key}`}>
                      Description / damage note
                    </FieldLabel>
                    <Textarea
                      id={`description-${line.key}`}
                      value={line.description}
                      onChange={(event) =>
                        updateLine(line.key, {
                          description: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor={`protection-${line.key}`}>
                        Protection
                      </FieldLabel>
                      <NativeSelect
                        className="w-full"
                        id={`protection-${line.key}`}
                        value={line.protection}
                        onChange={(event) =>
                          updateLine(line.key, {
                            protection: event.target.value as never,
                          })
                        }
                      >
                        {protectionStates.map((item) => (
                          <NativeSelectOption key={item}>
                            {item}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`access-${line.key}`}>
                        Access
                      </FieldLabel>
                      <NativeSelect
                        className="w-full"
                        id={`access-${line.key}`}
                        value={line.accessibility}
                        onChange={(event) =>
                          updateLine(line.key, {
                            accessibility: event.target.value as never,
                          })
                        }
                      >
                        {accessibilityStates.map((item) => (
                          <NativeSelectOption key={item}>
                            {item}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </Field>
                  </div>
                  <PhotoUploadSlots
                    key={`${line.key}-${snapshot.receiptLines.find((savedLine) => savedLine.id === line.id)?.photoIds.length ?? 0}-${fileResetVersion}`}
                    id={`linePhoto-${line.key}`}
                    name={`linePhoto-${line.key}`}
                    label="Material photos"
                    description="Required to receive. Add 1–3 photos for this material line."
                    existingCount={
                      snapshot.receiptLines.find(
                        (savedLine) => savedLine.id === line.id,
                      )?.photoIds.length ?? 0
                    }
                  />
                  <Field>
                    <FieldLabel htmlFor={`handling-${line.key}`}>
                      Handling requirements
                    </FieldLabel>
                    <Textarea
                      id={`handling-${line.key}`}
                      value={line.handlingRequirements.join("\n")}
                      onChange={(event) =>
                        updateLine(line.key, {
                          handlingRequirements:
                            event.target.value.split(/\r?\n|,/),
                        })
                      }
                      placeholder="One per line"
                    />
                  </Field>
                  {lines.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="self-end"
                      onClick={() =>
                        setLines((current) =>
                          current.filter((item) => item.key !== line.key),
                        )
                      }
                    >
                      <Trash2 aria-hidden="true" data-icon="inline-start" />
                      Remove line
                    </Button>
                  ) : null}
                </fieldset>
              ))}
              <Button
                type="button"
                variant="outline"
                className="self-start"
                onClick={() =>
                  setLines((current) => [
                    ...current,
                    emptyLine(`new-${Date.now()}-${current.length}`),
                  ])
                }
              >
                <PackagePlus aria-hidden="true" data-icon="inline-start" />
                Add receipt line
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>4. Label, stage, and review</CardTitle>
              <CardDescription>
                Phase 2 records the handwritten label; it does not generate
                labels or QR codes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field orientation="horizontal">
                  <input
                    className="size-4"
                    id="labelApplied"
                    type="checkbox"
                    checked={labelApplied}
                    onChange={(event) => setLabelApplied(event.target.checked)}
                  />
                  <FieldLabel htmlFor="labelApplied">
                    Physical handwritten project label applied
                  </FieldLabel>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="labelPhoto">Label photo</FieldLabel>
                    <Input
                      id="labelPhoto"
                      name="labelPhoto"
                      type="file"
                      accept="image/*"
                      capture="environment"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="stagingLocation">
                      Staging / default location
                    </FieldLabel>
                    <NativeSelect
                      className="w-full"
                      id="stagingLocation"
                      value={stagingLocationId}
                      onChange={(event) =>
                        setStagingLocationId(event.target.value)
                      }
                    >
                      <NativeSelectOption value="">
                        Unknown / not assigned
                      </NativeSelectOption>
                      {snapshot.locations.map((location) => (
                        <NativeSelectOption
                          key={location.id}
                          value={location.id}
                        >
                          {location.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="notes">Receiving notes</FieldLabel>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="operatorName">Operator name</FieldLabel>
                  <Input
                    id="operatorName"
                    value={operatorName}
                    onChange={(event) => setOperatorName(event.target.value)}
                    required
                    autoComplete="name"
                  />
                  <FieldDescription>
                    Preserved as receiving evidence alongside the authenticated
                    account.
                  </FieldDescription>
                </Field>
                {error ? <FieldError>{error}</FieldError> : null}
                {message ? (
                  <Alert>
                    <CheckCircle2 aria-hidden="true" />
                    <AlertTitle>Receiving updated</AlertTitle>
                    <AlertDescription>{message}</AlertDescription>
                  </Alert>
                ) : null}
                <Alert>
                  <AlertTriangle aria-hidden="true" />
                  <AlertTitle>Shared workflow</AlertTitle>
                  <AlertDescription>
                    Online drafts and private photos sync to the temporary
                    shared workspace. Offline work remains queued on this device
                    until Sync succeeds.
                  </AlertDescription>
                </Alert>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="submit"
                    name="intent"
                    value="save"
                    size="lg"
                    variant="outline"
                    disabled={saving}
                  >
                    <Save aria-hidden="true" data-icon="inline-start" />
                    Save draft
                  </Button>
                  <Button
                    type="submit"
                    name="intent"
                    value="receive"
                    size="lg"
                    disabled={saving}
                  >
                    <ClipboardCheck
                      aria-hidden="true"
                      data-icon="inline-start"
                    />
                    {saving ? "Working…" : "Review and receive"}
                  </Button>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>
        </form>

        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Saved drafts</CardTitle>
              <CardDescription>
                Resume after a reload without recreating evidence.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {drafts.length ? (
                drafts.map((receipt) => (
                  <button
                    key={receipt.id}
                    type="button"
                    onClick={() => resume(receipt.id)}
                    className="rounded-lg border p-3 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="block font-medium">
                      {receipt.receiptNumber || "No receipt number"}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {receipt.identityState} · {receipt.lineIds.length} line
                      {receipt.lineIds.length === 1 ? "" : "s"}
                    </span>
                  </button>
                ))
              ) : (
                <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  No receiving drafts.
                </p>
              )}
              <Button type="button" variant="ghost" onClick={reset}>
                Start a new receipt
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent receipts</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {snapshot.receipts
                .filter((receipt) => receipt.status === "Received")
                .toSorted(
                  (a, b) =>
                    Date.parse(b.completedAt ?? b.updatedAt) -
                    Date.parse(a.completedAt ?? a.updatedAt),
                )
                .slice(0, 8)
                .map((receipt) => (
                  <div key={receipt.id} className="rounded-lg bg-muted/55 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">
                          {receipt.receiptNumber || "No receipt number"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {receipt.lineIds.length} line
                          {receipt.lineIds.length === 1 ? "" : "s"} ·{" "}
                          {receipt.operatorName}
                        </p>
                      </div>
                      <Badge
                        variant={
                          receipt.identityState === "Matched"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {receipt.identityState}
                      </Badge>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <RecordIssueSheet
                        receiptId={receipt.id}
                        projectId={receipt.projectId}
                        size="sm"
                      />
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
