# HEEBA / هيبة — PRD

## Original problem statement
Arabic-first (RTL) PUBG / Battle-Royale themed rewards mobile app called "هيبة / HEEBA — PUBG Rewards & Lucky Wheel". Strong gaming/military identity (dark + gold), animated fire sparks, daily lucky wheel, PUBG-related prizes with rarity tiers, rewards store, my-rewards inventory, player profile, referrals, notifications (in-app + push), content creators, cosmetic mandatory subscription, and a full admin dashboard with no-code control over prizes, products, win rates, quantities, images (upload + URL), app settings, bottom-bar labels, and app backgrounds (add/change/delete). Web link ready for all users.

## Architecture
- Frontend: Expo Router (React Native), react-query, reanimated, react-native-svg wheel, expo-image, gold/dark theme in src/theme.ts (dark-first). Fonts: Cairo (Arabic) + Rajdhani (numbers).
- Backend: FastAPI + MongoDB (motor). UUID string ids, _id excluded, soft deletes (deleted_at).
- Integrations: Emergent Google Auth (users), JWT email/password (admin), Emergent Object Storage (image uploads), Emergent push notifications.

## User personas
- Player: signs in with Google, spins daily wheel, buys with points, tracks rewards, invites friends.
- Admin: manages all content/config from the in-app admin panel (no code).

## Core requirements (static)
- Daily wheel (24h cooldown, weighted by admin win%, 0% = never wins), rarity Common/Rare/Epic/Legendary.
- Store purchases deduct points, create rewards with order numbers + status.
- Full admin control incl. field-level explanations and app background management.

## Implemented (2026-06)
- Google auth + separate admin auth with in-panel password change.
- Home lobby (wheel + sparks + gold identity + rarity legend), Store (categories, buy), My Rewards (won/purchased, status, order #), Profile (stats + points history + avatar URL), Referrals (code/share/apply), Notifications (list + read), Content Creators, cosmetic Subscription.
- Admin: dashboard stats, Prizes CRUD, Products CRUD, Creators CRUD, Backgrounds CRUD (per-screen), Settings (app name, tab labels, backgrounds, signup/referral bonus, spin cooldown), Notifications send/history (push), Users + points adjust, Orders/reward status, change password.
- Image upload (device + URL) via Object Storage. Animated fire sparks (reanimated). Gold PUBG theme.
- Backend tested: 35/35 pytest passed. Admin frontend E2E passed.

## Backlog / next
- P1: Native build to validate push notifications (needs google-services.json).
- P2: Level/XP progression bar on profile; store item detail improvements; wheel spin sound (needs audio asset).

## Admin credentials
- heeba@heeba.com / heeba (changeable from Admin → الإعدادات).
