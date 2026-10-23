# Facilities Evidence OS (FEOS)

**Project creator and maintainer: [Tyler Katayama](https://github.com/tylerkat89) · [Attribution](ATTRIBUTION.md)**

**Interact with your building, not your spreadsheets.**

Map-first facilities software I am building as a solo project. Issues, vendors, photo evidence, inventory, and budgets stay attached to the room they belong to so maintenance teams enter information once and find it again from a floor plan.

This is my main portfolio project while I study Computer Information Systems at Fullerton College and bring years of hands-on facilities / HVAC field experience into software.

## What it does

- Floor-plan map as the home screen for a building
- Issue and work records tied to specific rooms
- Vendor and evidence capture without leaving the map context
- Inventory and budget views with role-based access for pilots
- QR landing pages so a phone can open the right room/record in the field

## Stack

- **Frontend:** React 19, TypeScript, Vite, TanStack Router / Query / Table, Tailwind CSS
- **Backend / data:** Node server, PostgreSQL (Kysely), migrations
- **Auth:** better-auth
- **Extras:** PGlite for local/demo paths, Playwright for checks

## Repo layout

| Path | Purpose |
| --- | --- |
| `public/feos.html` | Floor demo + blank template |
| `public/card.html` | QR landing / founding pilot |
| `public/qr.html` | Hold-up QR (`/qr`, roommate `/qr/ups`) |
| `src/` | App UI and client logic |
| `server/` | API and auth |
| `migrations/` | Database schema changes |
| `scripts/` | Dev, migrate, and check helpers |

## Status

Active personal build / pilot-oriented demo. Not a production multi-tenant SaaS yet. Secrets, live database URLs, and customer evidence stay **off** this repository.

## About me

**Tyler Katayama** · Fullerton College · AS, Computer Information Systems (in progress)  
Facilities and HVAC background → software / systems / IT  
GitHub: [github.com/tylerkat89](https://github.com/tylerkat89) · Email: facilitiesevidenceos@gmail.com · Phone: (657) 631-4170
