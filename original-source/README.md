# Sivan Films — The Living Studio

Published Sivan Films 360° office experience with a protected website content workspace at `/admin`.

## Admin access
Sign in using the Sites-hosted **Sign in with ChatGPT** flow. The server currently allows verified `sivanfilms@gmail.com`, `oculixofficial@gmail.com` and the existing site-owner account `ramesh547747@gmail.com`. Public visitors do not need to sign in. Every admin read/write and draft-preview request checks authorization on the server; no password or API secret is embedded in the browser.

## Content workflow
Edit rooms/services, contact details, logo, TV names/logos, seven gallery positions and the garden/Metaverse video playlists. **Save draft** persists privately in D1. **Preview saved draft** opens the 3D studio using the admin-only draft API. **Publish changes** copies the validated draft to the public configuration. Refreshed visitor pages use that configuration. Optimistic revision numbers reject conflicting edits. Publishing history records actor/time/action and supports restoring snapshots to a draft. Download draft JSON for an additional content backup.

Media fields accept existing `/assets/` paths or HTTPS file URLs. New media must be hosted before linking; file uploads are not implemented. Remote videos need browser-compatible encoding and CORS headers for WebGL textures. Architecture, rig assets, furniture, collision geometry and fixed wall frame positions are source-controlled, not editable in this CMS. The dedicated favicon remains the original Sivan Films icon.

No fabricated visitor/sales analytics, payments or CRM lead counts are included. The enquiry form continues to open WhatsApp; enquiries are not saved in this panel.

## Implementation
Original buildless public scene retained in `public/`. Root HTML is `source/studio.html`, served by `app/route.ts`; original content fallback is `public/content-base.js`. `public/content.js` fetches the published configuration and merges it with the fixed room geometry. Default content in `source/default-content.json` preserves the current website, including only two garden videos. Vinext handles protected admin/API routes and Cloudflare D1 stores settings/history. Hosting identity and public audience are preserved.

Build through the installed Sites `build-site.mjs` helper. Database schema: `db/schema.ts`; generated SQL and metadata: `drizzle/`. Run `node checks/admin-check.cjs` for authorization, origin, validation, draft/public separation, optimistic concurrency and restoration checks. `node_modules/.bin/tsc --noEmit --pretty false` checks types. Framework setup notes are in `source/FRAMEWORK-README.md`. The asset register and licenses cover original third-party scene assets.
