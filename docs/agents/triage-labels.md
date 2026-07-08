# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

## Design-gate labels (`/design` skill)

| Label             | Meaning                                                                   |
| ----------------- | ------------------------------------------------------------------------- |
| `needs-design`    | User-visible issue; design gate applies, spec not yet approved             |
| `design-approved` | Approved design spec (screenshots + tokens) is on the issue; gate has run  |

Gate rule: an issue may not carry `ready-for-agent` (for the build) while
`needs-design` is present — the design phase itself IS the agent-actionable
work. When the spec comment lands, swap `needs-design` → `design-approved`.
Non-visual issues carry neither label.

Edit the right-hand column to match whatever vocabulary you actually use.
