# Spark Quotes

**A daily motivational quotes app with favourites, user-submitted quotes and push notifications.**

**Live demo:** [quotes.wearesparklab.com](https://quotes.wearesparklab.com/)

Built with Expo (React Native Web + TypeScript), Supabase and Vercel. It runs as an installable web app (PWA) and can also be built for iOS and Android.

## Features

- Browse quotes by topic and save favourites to your account.
- **Submit a quote:** submissions go through a moderation queue (Supabase Edge Function) before they're published.
- **Daily push notifications** via Firebase Cloud Messaging, sent by an hourly Vercel cron job. Tokens are scoped per device, and deliveries are logged.
- **SEO pages:** a build script generates static, crawlable pages for every approved quote and category (`/quotes`, `/quotes/<category>`, `/quote/<slug>`), because the app shell alone isn't indexable.
- **Social previews:** dynamic Open Graph images generated with `@vercel/og`.
- **Accounts:** email/password sign-up, password reset, and a delete-my-account function.
- Optional supporter links and keys for people who want to tip.

## Tech stack

| Area | Tools |
|---|---|
| App | Expo SDK 53, React Native 0.79, React 19, TypeScript, expo-router |
| Backend | Supabase: Postgres with RLS, Auth, Edge Functions (`submit-quote`, `redeem-support-key`) |
| Notifications | Firebase Cloud Messaging, Vercel Cron and serverless routes in `api/` |
| Hosting | Vercel (static web export, serverless functions, cron) |

## Run it locally

```bash
git clone https://github.com/WeAreSparkLab/spark-quotes-web.git
cd spark-quotes-web
npm install
cp .env.example .env     # fill in your own values
npx expo start --web
```

Requires Node 24.x. In `.env`:

- **Client values** (`EXPO_PUBLIC_*`) are bundled into the app and are public by design. Use the Supabase anon/publishable key only.
- **Server values** (`SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `FIREBASE_SERVICE_ACCOUNT`) belong only in your hosting provider's environment settings, never in client code.

Apply the SQL in `supabase/migrations/` to your own Supabase project to create the schema, RLS policies and notification tables.

## Build and deploy

```bash
npm run build:web   # expo export + post-build step (service worker version, SEO pages)
```

Vercel runs `vercel-build` automatically and registers the hourly notification cron from `vercel.json`. The build reads approved quotes from Supabase to generate the SEO pages.

## What I'd improve next

- Add tests for the moderation flow and the notification scheduler.
- Add an admin screen for approving or rejecting submitted quotes.
- Move the cron-triggered notification logic into a queue so large audiences don't hit function time limits.
- Rename the package (it still carries the starter template name) and tidy the dependency list.
