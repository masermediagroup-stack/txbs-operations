# TBS Operations Domain Context

This glossary records the operational language used by the application. It defines business meaning, not storage or UI implementation.

## Business setting

Texas Building Specialties currently operates two inventory Sites. Lavon Yard contains eight numbered Conex containers plus the confirmed North Yard, Middle Yard, and South Yard storage areas. Richardson Office & Warehouse is the main office with a small indoor material-storage area. Any future warehouse is an additional Site; it does not replace either current Site.

## Core terms

### Site

A distinct TBS operating place that owns its locations and operational records. Lavon Yard and Richardson Office & Warehouse are current Sites.

### Storage Location

A named, addressable place at a Site where material can be stored or staged. Conex 1 through Conex 8 and the three named yard areas are Storage Locations.

### Storage Position

The precision within a Storage Location. A position is Exact, General, or Unknown. An exact Conex position uses front/middle/back and left/center/right; it is recorded only after field confirmation.

### Inventory Project

The Inventory record for one customer job/project destination. A Project does not represent multiple job sites. Its official name, aliases, field-label text, job number, and purchase orders can identify it. Its Material Lots may be distributed across multiple TBS inventory Sites and remain one Project rather than being duplicated per storage Site. Project status describes the job’s operational stage and is separate from material presence or readiness.

### Project Stage

The Operator-maintained lifecycle marker for an Inventory Project: `Ordered`, `Shipped`, `Received`, `Stored`, `Ready for Delivery`, `Delivered`, or `Installed`. `Shipped` means the supplier reports material moving toward TBS; `Delivered` means TBS material reached the customer job site. A stage change never moves Material Lots or replaces Receiving, Project Readiness, Outbound Batch, delivery, or installation records.

### Project Alias

An alternate project name used by TBS staff. An alias does not replace the official project name.

### Field Label

Handwritten or locally applied project wording found on physical material. Field-label text is searchable evidence and may differ from the official project name.

### Material Group

A project-specific description that organizes related physical Material Lots. Its name is the TBS operational/common name used by the team; supplier wording may be retained separately in its description or a future supplier-description field. It does not own package totals.

### TBS Material Name

The common operational name TBS uses to identify material in conversation, search, receiving, storage, and field work. It may differ from a supplier's catalog or invoice description and must not be overwritten merely to match supplier wording.

### Supplier Material Description

The supplier-provided name, catalog wording, or line description for material. It is supporting reference data and does not replace the TBS Material Name.

### Operator Account

A broadly trusted business account for people who need the complete operational picture. An Operator may work in the office, leadership, material management, a yard, or a warehouse. Operator is an access scope, not a job title, physical-work location, or rank.

### Tech Account

A focused field-work account. A Tech can view the inventory and outbound context needed to understand material headed to project sites and, as field modules launch, confirm installation and report field exceptions. Tech access excludes Procurement, costs, account administration, configuration, and operational changes outside the Tech workflow.

### Material Lot

A traceable physical quantity of one Material Group. A lot has a package type, whole-number quantity or explicitly unknown quantity, location, position, presence, condition, protection, accessibility, handling requirements, and verification history. Project and material totals are derived from active lots.

### Verification

An operator’s dated confirmation that a Material Lot is still present at its recorded location. A lot Needs verification when it has no confirmation or its latest confirmation is at least 14 days old.

### Activity Event

An append-only record of an operational action. Before authentication, every action preserves the operator name entered for that action.

### Photo Record

Typed evidence linked to a project, lot, location, receipt, or issue. Photo types include material, label, condition, location, and document evidence.

### Receiving

The inbound workflow that identifies a shipment, inspects it, records packages and evidence, applies or confirms its field label, assigns storage, and creates Material Lots. Every receipt line requires material-photo evidence before Receiving can be completed. Other workflows do not universally require photos, but a Damaged Issue always requires linked damage-photo evidence.

### Receipt

The durable record of one receiving workflow. A Receipt may initially have an unresolved project identity without losing the original evidence.

### Material Movement

An immutable record that one or more Material Lots changed storage position together for an operator-stated reason. A correction is a new reversal movement and never erases the original record.

### Movement Line

The source, destination, moved quantity, and resulting lot for one Material Lot within a Material Movement.

### Lot Lineage

The parent-and-root relationship that connects a partial-move child lot to the physical lot from which it was split.

### Project Readiness

A derived assessment of whether an Inventory Project's present material is confirmed and free of unresolved blocking Issues. Project Readiness is separate from the project's operational status.

### Outbound Batch

A controlled grouping of selected Material Lot quantities for one Inventory Project and Site. A batch progresses from Planned to Ready to Departed; cancellation and reversal preserve the original history.

### Outbound Line

The reserved quantity and field snapshot for one Material Lot in an Outbound Batch. A partial departure creates a traceable removed child lot while leaving the remainder present.

### Departure

The recorded point when an Outbound Batch leaves the Site. Departure removes the selected quantities from present inventory and records the operator, time, optional carrier or driver reference, and optional evidence.

### Issue

An operational exception linked to the affected project, lot, receipt, location, movement, or outbound record. Open and In Progress are active Issue states; an active blocking Issue prevents derived readiness but does not replace material condition or presence. Resolved and Dismissed Issues remain in history and may be reopened. A Damaged Issue records visible material damage and must retain at least one linked damage photo; it may track follow-up for a supplier return without becoming a vendor claim or shipping record.

### Issue Comment

An append-only follow-up on an Issue. A comment records the operator, time, text, and optional photo evidence without rewriting the original exception.

### Issue Transition

An immutable record of an Issue being created, assigned, linked, or changing status. A transition preserves the acting operator, time, prior/current status, and required operational note.

### Operational Report

A reproducible read-only view derived from authorized operational records. A report never replaces its source records, treats unknown facts differently from zero, and provides a path back to the underlying work.

### Verification Due Date

The UTC date and time fourteen days after a Material Lot's latest Verification. A lot with no Verification is reported separately as Never verified; its first review date is fourteen days after the lot was recorded on site.

### Recorded Material Age

The elapsed time since a Material Lot was first recorded on site. It is not called Receipt age unless a durable Receipt-to-Lot relationship exists.

## Module ownership

Inventory owns Inventory Projects, Material Groups and Lots, Storage, Receiving, Movement, Outbound, Activity, Photos, Verifications, and Issues. The Operations-level Projects area remains reserved for future cross-operational project records.
