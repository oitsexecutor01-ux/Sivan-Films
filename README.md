# Sivan Films React project

Export of the current Sivan Films source, organised with separate frontend and backend folders.

## Live website

- Website: https://sivan-films.onrender.com
- Admin: https://sivan-films.onrender.com/admin

## Requirements
Node.js 24 LTS or later and npm. The backend uses Node's built-in SQLite module. SQLite may display an experimental warning depending on your Node version.

## Run locally
1. Open a terminal in `frontend` and run `npm install`, then `npm run build`.
2. Copy `backend/.env.example` to `backend/.env`.
3. Set your admin email and a unique password of at least 12 characters. The example password is deliberately rejected.
4. Open a terminal in `backend` and run `npm start`.
5. Visit http://localhost:4000 and http://localhost:4000/admin.

For frontend development, keep the backend running and run `npm run dev` inside frontend. Visit the Vite address. API requests proxy to port 4000.

## Structure
Frontend src contains assets, components, context, pages, routes, services and utils, plus App.jsx, App.css, index.css and main.jsx. Backend src contains config, controllers, middleware, models, routes, services and utils, plus server.js.

The original Three.js experience remains intact in frontend/public/app.js with its original assets. React mounts its existing markup and starts the scene from the Studio page. The admin interface is a React component. Three.js render-loop code remains imperative to preserve the existing experience. Some admin code remains TypeScript/TSX, supported by Vite and Node 24.

The independent backend replaces ChatGPT-hosted admin authentication and Cloudflare D1 with a password login, six-hour sessions and SQLite. This package contains the repository's default content, not a dump of the live production database. To transfer live CMS edits, download a draft backup in the existing admin panel and use its values in backend/src/config/default-content.json BEFORE the first backend launch. Once created, the SQLite database is the content authority.

Video source URLs configured in the content may reference external hosts. Internet access and permission to use those media remain necessary. Local assets and the existing Three.js licence files are included. No Firebase setup is required.

## Production
Build the frontend, run the backend behind an HTTPS reverse proxy, set NODE_ENV=production, persist backend/data and back it up. Set correct origin and Host forwarding on your proxy. Admin credentials belong in environment configuration and must not be committed. Keep only required ports accessible.

Original source snapshot is included under original-source for reference. It excludes Git history, environment secrets and dependencies. The live website has not been changed by this export.

## Meta Quest VR

Open the HTTPS website in Meta Quest Browser, enter the studio, then select **Enter VR** and allow immersive VR. The button is shown only when the browser reports immersive VR support. Use Quest Touch controllers:

- Left thumbstick: walk; right thumbstick: 30-degree snap turn.
- Trigger: select a room/menu button or point down at a clear floor area to teleport (green ring). Teleport paths respect the studio collision map.
- Grip: open/close the floating room directory. It opens automatically on entry.
- Room directory: jump to a room, reception, or garden; choose Exit VR to return to the browser.
- Selecting existing scene displays exits VR before opening their browser-based details.

VR uses floor-relative head tracking and reduced rendering cost (no realtime shadows). Hand tracking is not implemented. Real Quest 3 visual quality, controller mapping, frame rate, and comfort still require testing on the headset. Physical movement follows headset tracking; use your Quest boundary to stay within your real play area.
