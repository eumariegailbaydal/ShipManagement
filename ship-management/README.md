# Ship Management — Fleet Ops

A crew, certification, ship operations, and maintenance tracker built for a
4-ship / ~100-crew fleet. Built with Next.js, Supabase, and deployed on Vercel.

The database (all tables, security rules, and storage bucket) is **already live** —
project `ship-management` on Supabase. This repo is the website that connects to it.

---

## 1. Get this code onto GitHub

1. Go to [github.com/new](https://github.com/new) and create a new **private** repository (e.g. `ship-management`). Don't add a README/gitignore — leave it empty.
2. On the empty repo's page, GitHub shows a "Quick setup" screen with git commands — just below those commands is a line that says *"or you can [uploading an existing file](...)"*. Click the **"uploading an existing file"** link there.
3. Drag in every file and folder from this project (keep the folder structure intact).
4. Commit directly to `main`.

*(If you're comfortable with git instead: `git init`, `git add .`, `git commit -m "Initial commit"`, `git remote add origin <your-repo-url>`, `git push -u origin main`.)*

## 2. Deploy it on Vercel

1. Go to [vercel.com/new](https://vercel.com/new).
2. Click **Import** next to the GitHub repo you just created (authorize GitHub access if asked).
3. Before clicking Deploy, open **Environment Variables** and add these two
   (values are also in `.env.local.example` in this repo):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://mrvycxarurzqdabkdasf.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(copy from `.env.local.example`)* |

4. Click **Deploy**. In about a minute you'll get a live URL like `ship-management.vercel.app`.

From now on, every time this code is updated and pushed to GitHub, Vercel rebuilds the live site automatically — no redeploy step needed.

## 3. Create your first login (admin account)

The app has no public sign-up — accounts are created by an admin. To create the very first one:

1. In your Supabase project, go to **Authentication → Users → Add user**.
2. Enter your email and a password, and create the user. Copy the **User UID** shown.
3. Go to **Table Editor → profiles → Insert row**, and add:
   - `id`: paste the User UID from step 2
   - `full_name`: your name
   - `role`: `admin`
   - `ship_id`: leave blank
4. Go to your live Vercel URL and log in with that email/password.

The first profile created is automatically allowed to be an admin — after that, only admins can create further logins (repeat steps 1–3, using roles like `fleet_manager`, `crewing_officer`, or `captain`; for `captain`, also set `ship_id` to scope them to one ship).

## 4. What's built

- **Dashboard** — fleet-wide overview: ship/crew counts, open work orders, certs needing attention, recent incidents
- **Ships** — vessel profiles and live status (in port / at sea / anchored / dry dock)
- **Crew** — roster with rank, nationality, contact info, and status
- **Certifications** — every crew certificate with automatic color-coded status (valid / expiring soon / expired)
- **Maintenance** — scheduled upkeep tasks per ship, with one-click work order creation
- **Work Orders** — open → in progress → completed → verified pipeline
- **Incidents** — defect and accident reporting by ship and severity

**Roles & permissions** (enforced at the database level, not just hidden in the UI):
- **admin / fleet_manager** — full access to everything
- **crewing_officer** — manages crew and certifications
- **captain** — only sees and manages their own assigned ship's certs, maintenance, work orders, and incidents
- **office_staff** — read-only across the fleet

## 5. Running it locally (optional)

Only needed if you want to preview changes before pushing. Requires [Node.js](https://nodejs.org).

```
npm install
cp .env.local.example .env.local
npm run dev
```

Then open http://localhost:3000.

## 6. What to build next

Not yet included, worth adding as the system grows:
- Document upload UI for certificate scans (the `documents` storage bucket is already set up)
- Ship-level certificate & inspection tracking screens (the `ship_certifications` and `inspections` tables already exist in the database)
- Email/notification alerts for certs expiring soon
- Crew assignment history (sign-on/sign-off) screen — the `crew_assignments` table is ready
