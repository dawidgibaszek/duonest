# iOS partner location widget

Uses the existing DuoNestWidget extension and App Group `group.com.belka.duonest`.
Android sources and Android push delivery are unchanged.

## Families and content

Home Screen: small, medium, large, extra large (iPad). Lock Screen: inline,
circular, rectangular. StandBy uses the system's supported Home Screen family.
The layouts use the app's ink, white and cream palette with serif headings.
Home Screen widgets show a MapKit snapshot, address and relative capture time;
large layouts also show accuracy. Lock Screen layouts show compact location or
capture-age information. No layout describes an old fix as live. Tapping a fix
opens Apple Maps. Sensitive widget content is marked with `privacySensitive()`.

## Data and background delivery

- `/api/widget/location` reuses the opaque, read-only widget credential. Each read
  verifies account, current membership, partner profile, active sharing grant and
  location expiry. No Firebase refresh token is given to the extension.
- A Firestore onWrite trigger on location fixes sends WidgetKit pushes to the
  partner and silent FCM to **iOS devices only**. Deletes also invalidate widgets.
  Push payloads contain no coordinates or address. On iOS 26+, WidgetKit can reload
  independently of the app process. Earlier iOS versions use silent push and
  timeline refresh as a fallback.
- A timeline requests a refresh after 15 minutes as a fallback. Actual timing is
  decided by iOS; neither push delivery nor per-second widget updates is guaranteed.
  Capture time remains visible and the cached position expires after 24 hours.
- The existing native location tracker keeps sharing in the background after the
  user opts in. With Always permission, significant-change monitoring can relaunch
  it after system termination. The location-only grant is stored in device-only
  Keychain storage, available after first unlock. A separate installation-local
  opt-in flag prevents a retained Keychain item from resuming sharing after reinstall.
  Stopping sharing clears the grant and stops both location services.
- Force-quitting the sender app, disabling Location Services/background access,
  loss of connectivity or system scheduling can stop/delay delivery. Always access
  is needed for restoration. A widget cannot bypass these restrictions. The existing
  14-day widget read credential needs renewal by opening the signed-in app.

## Release and validation

Deploy Functions `api` and `refreshPartnerLocationWidgets` before releasing the
new iOS build. The trigger needs the existing `APNS_KEY_PRODUCTION` and
`APNS_KEY_SANDBOX` secrets. The existing WidgetKit APNs team/topic and App Group
entitlements are reused. No Android release is required.

Checks:

- `npm --prefix functions run build`
- `node --test functions/tests/widgetLocation.cjs`
- Swift typecheck for all widget sources against the iOS SDK with
  `-application-extension` and minimum target iOS 17.

On physical paired iPhones, verify foreground/background movement, system
termination with Always permission, force-quit limitations, offline capture age,
stop-sharing, logout and unpairing. Test all seven families, long names/addresses,
Lock Screen privacy and iOS 26 WidgetKit push delivery. Verify the existing drawing
widget alongside the location widget. Production APNs delivery and signing require
an installed build and deployed backend; static checks cannot validate them.
