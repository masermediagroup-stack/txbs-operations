# ADR 0010: Separate product content from handling-unit identity

- Status: Accepted
- Date: 2026-10-13

Existing Material Lot quantities describe whole packages, while purchasing, handoff and installation need product quantities and units of measure. Preserve those historical package facts and evolve additively: a separately identified Handling Unit has one or more product content lines, each retaining its own quantity/UOM and receipt/material lineage. The user confirmed on October 13 that several different products for one job may share a box, pallet or bundle; an Outbound Handling Unit still belongs to one job.

Treating each package as one product would force artificial physical splits and make a mixed-product box impossible to represent. Reinterpreting old package counts as product quantities would invent stock and change retained command/history meaning. Splits, repacks and allocations must therefore conserve known product quantities per content line/UOM while preserving package identity/history independently. Unknown product content remains explicit. UOM precision/conversion, return compensation and allocation correction rules remain WF-03 decisions; this ADR does not settle them or close source/rollout gates.
