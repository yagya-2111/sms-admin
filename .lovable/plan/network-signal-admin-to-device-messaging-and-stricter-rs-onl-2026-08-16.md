# Network signal, admin-to-device messaging, and stricter Rs-only txn parsing

Four related changes across the APK, backend, and admin panel.

## 1. Only count debit/credit when "Rs" is on the front

In `src/pages/DeviceSms.tsx`, tighten `parseTxn` so a message counts as a transaction **only** when the amount is prefixed by `Rs`, `Rs.`, `INR`, or `₹` directly before the number (e.g. `Rs 14,500`, `Rs.20000`, `INR 500`, `₹1,200`). Messages that just contain a number without an `Rs`-style prefix are ignored (no badge, not in PDF, not counted in the summary).

## 2. Network signal strength on the admin panel (like battery)

- **DB**: add `signal_strength` (int, 0–4) and `network_type` (text: `2G`/`3G`/`4G`/`5G`/`WIFI`/`NONE`) columns to `devices` via migration.
- **Edge function** (`sms-receiver` heartbeat): accept and persist the two new fields.
- **APK**:
  - Add `READ_PHONE_STATE` and `ACCESS_NETWORK_STATE` permissions.
  - New `NetworkHelper.kt` uses `TelephonyManager` + `SignalStrength` (via `PhoneStateListener` cached value) and `ConnectivityManager` to compute level 0–4 and network type.
  - `ApiClient.sendHeartbeat` includes `signal_strength` and `network_type`.
- **Admin UI** (`DeviceManager.tsx`): render a signal-bars icon next to the battery — 4 bars filled by level, color = green (3–4) / amber (2) / red (0–1), with a small label (`4G · Strong`, `WIFI · Good`, `2G · Weak`, `No signal`).

## 3. In-APK "poor network" warning with alert sound

- `NetworkHelper` exposes `isPoor()` (level ≤ 1 or no data).
- `MainActivity` observes network changes (via `ConnectivityManager.NetworkCallback` + a 30s poll) and shows a red top banner: *"Weak network — please move to a better signal area"* whenever poor.
- Plays a short looping "wipe wipe" alert (a small bundled `alert.wav` in `res/raw/`) while the banner is visible; stops when signal recovers. User can tap the banner to mute for 5 minutes.

## 4. Admin-to-device custom message

- **DB**: new table `device_messages` (`id`, `device_id`, `body`, `created_at`, `delivered_at`, `read_at`).
- **Edge function**: 
  - `POST /send-message` — admin inserts a message row.
  - `GET /poll-messages?device_id=...` — device fetches undelivered messages, marks `delivered_at`.
- **APK**:
  - `MessagePoller` (piggybacks on existing 5s command poll) fetches new messages, shows a full-screen dialog with the text + an OK button, plays the same alert sound once, and posts read receipt.
- **Admin UI** (`DeviceManager.tsx` and `DeviceMedia.tsx`): a "Send Message" button opens a dialog with a textarea + Send; shows a small history list (last 10) with delivered/read timestamps.

## Technical notes

- No changes to auth model; existing admin routes protect the new UI.
- All new tables get `GRANT` + RLS policies (admin-only writes via existing `has_role` check; edge function uses service role for device-side calls).
- Sound file will be a small (~10 KB) synthesized wav placed at `android-app/app/src/main/res/raw/alert.wav`.
- No new npm deps; APK adds no new Gradle deps (uses platform APIs).
