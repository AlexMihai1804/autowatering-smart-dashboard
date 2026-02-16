# Back Navigation Test Matrix (Mobile)

Use this checklist on Android after each release.

## Rules
- Hardware back and UI back should behave the same.
- On `/dashboard`, first back shows exit hint, second back exits app.
- Tab switches should not create long back chains.

## Scenarios
1. Open app on `/dashboard`, press hardware back once.
Expected: toast "Press back again to exit".

2. Press hardware back again within ~2s on `/dashboard`.
Expected: app exits.

3. Go to `/settings` from bottom tabs, press back.
Expected: `/dashboard`.

4. Go to `/settings -> /device`, press back.
Expected: `/settings`.

5. Go to `/settings -> /premium`, press back.
Expected: `/settings`.

6. Go to `/settings -> /profile`, press back.
Expected: `/settings`.

7. Go to `/settings -> /help`, press back.
Expected: `/settings`.

8. Go to `/settings -> /manage-devices`, press back.
Expected: `/settings`.

9. Go to `/settings -> /alarms`, press back.
Expected: `/settings`.

10. Open `/zones -> /zones/:id`, change tab inside details, press back.
Expected: returns to previous internal tab first (interceptor behavior), then to `/zones`.

11. Open `/zones`, switch to `/ai-doctor` tab, then back.
Expected: no tab-loop; returns to logical previous route or parent fallback.

12. Open `/zones`, enter `/zones/:id/config`, press back.
Expected: `/zones/:id`.

13. Open `/device/info`, press back.
Expected: `/device`.

14. Open `/app-settings`, press back.
Expected: `/settings`.

15. Open `/weather`, press back.
Expected: `/dashboard`.
