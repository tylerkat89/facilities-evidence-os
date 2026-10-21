# Facilities Evidence OS
**Interact with your building, not your spreadsheets.**

Map-first facilities software I'm building from 10+ years of hands-on facilities and HVAC troubleshooting. Issues, vendors, photo evidence, inventory, and budgets belong with the room they're about.

[Explore FEOS](https://facilities-evidence-os.vercel.app/) · [Project context](#origin--why-i-built-this) · [Local development](#local-development) · [Portfolio](https://github.com/tylerkat89)

## Origin / Why I built this
**Personal — independent product.**

I know the gap between finding a problem in the field and keeping everyone informed about it. FEOS puts the floor plan at the center so a maintenance team can enter information once and return to it in context. My Computer Information Systems studies at Fullerton College support the build; the problem comes from my facilities work.

## Status and scope
**Active development / founding pilot.** The linked site introduces the product and offers a demo and pilot signup. This public repository is an earlier source snapshot, last changed before this documentation pass in October 2026. It should not be treated as an exact copy of the current hosted service or as production certification.

## What you can inspect here
- A floor-plan interface for room-linked issues and work records.
- Vendor, evidence, inventory, and budget workflows.
- QR entry points for field use.
- Supporting client, server, migration, and test code.

A demo showing a workflow does not establish that every deployment or access boundary has been independently audited.

## Local development
The package uses React, TypeScript, Vite / TanStack, Tailwind CSS, and Node with PostgreSQL-related data code. Some local paths use PGlite.

```sh
npm ci
npm run dev
```

Review configuration and use isolated local/test data first. **`npm run build` also runs database migrations.** Do not run it with live database credentials for a portfolio preview.

Available checks are `npm run typecheck`, `npm test`, and `npm run lint`. These are repository commands, not a claim that this audit ran the application test suite.

## Find your way around
| Path | Purpose |
| --- | --- |
| `public/feos.html` | Floor-plan interface and template |
| `public/card.html` | Field-facing introduction / pilot entry |
| `src/` | Client, routes, and shared application code |
| `server/` | Server middleware |
| `migrations/` | Schema changes |
| `scripts/` | Development and verification helpers |

The package still carries the original `app-builder-workspace` scaffold name. That is build metadata, not the project's identity.

## Public portfolio boundary
Use synthetic examples for demonstrations. Customer records, private floor plans, production credentials, and operational setup belong outside the public showcase. This documentation pass does not certify the existing source or history as free of sensitive material.

Built by [Tyler Katayama](https://github.com/tylerkat89). For the wider picture, [visit my Linktree](https://linktr.ee/themountainshinobi).
