# [NOT RELEASED / v4.0]
## Added
- USBModeDual is added. CAN'T BE USE AT THE SAME TIME AS "USBMode"
- JoindreZoom.js: Added "Advanced Options" (DTMF Options in SIP URI)
- JoindreZoom.js: Added support for icon order
- JoindreZoom_UI.js: Added support for icon order
- JoindreZoom_UI.js: Added support for "Advanced Options"
- RoomConfig.js: Added the "UI/iconOrder" section
- RoomConfig.js: Added the "usbmode/pcInput1" and "usbmode/pcInput2" for the "USBModeDual" macro
- RoomController.js: Added support for icon order
- Scenarios.js: Added experimental support for custom scenarios (external scenarios)
- Settings.js: Added support for icon order
- USBMode.js: Added support for icon order
- USBModeDual.js: Added macro

## Changed
- Settings.js: The system is now unmuting itself on reset (sleep)
- Settings.js: The system is now setting the default volume on reset (sleep)

## Fixed
- Displays.js: Corrected a rare bug with the TV Power Off function
- JoindreZoom.js: Corrected a minor bug with a non-sip call which leads to a warning in the console
- JoindreZoom.js: Corrected a bug where the host key is asked even if user is joining as a guest
- JoindreZoom.js: DTMF menu is now closed before sending another DTMF command
- RoomController.js: Corrected a bug that prevents the system from reseting to "AutoDisplay" and "AutoLights" when the system is put to sleep
- Settings.js: Adjusted the "Activities" buttons layout
- USBMode.js: Corrected a bug where the system is recalling the "Tableau" preset instead of the "Console" preset when the "authEnablePresenterTrack" setting is "true"
