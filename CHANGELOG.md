# [NOT RELEASED / v4.0]
## Added
- USBModeDual is added. CAN'T BE USE AT THE SAME TIME AS "USBMode"
- JoindreZoom.js: Added "Advanced Options" (DTMF Options in SIP URI)
- JoindreZoom.js: Added support for icon order
- JoindreZoom_UI.js: Added support for icon order
- JoindreZoom_UI.js: Added support for "Advanced Options"
- RoomConfig.js: Added the "UI/iconOrder" section
- RoomConfig.js: Added the "usbmode/pcInput1" and "usbmode/pcInput2" for the "USBModeDual" macro
- RoomConfig.js: Added the "audio/useCombinedAecReference" for the new AEC reference method (audioconsole)
- RoomController.js: Added support for icon order
- Scenarios.js: Added experimental support for custom scenarios (external scenarios)
- Scenarios.js: Added a video-matrix "show-selfview" replacement to fix a selfview bug when using custom video composition
- Scenarios.js: Added support for new AEC reference method
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
- USBMode.js: Corrected a bug where the system is recalling the "Tableau" preset instead of the "Console" preset when the "autoEnablePresenterTrack" setting is "true"


## Config Adjustements for v4.0
### config.ui
```
ui:{
   iconOrder:{
     zoom:1,
     usbmode:2,
     settings:3,
     shutdown:4
   }
}
```

### config.usbmode
```
usbmode: {
    showRecordingOption: false,               //Affiche l'option "Enregistrement" dans le mode USB <true, false>
    autoDetectUSBConnection: false,           //Détection de la connexion du USB pour lancer Mode USB. <true, false>
    localPcInput1:4,                          //Entrée 1 pc local
    localPcInput2:3                           //Entrée 2 pc local
}
```

### config.video
```
video: {
    remoteMonitorOutputId: 3,                 //Connecteur HDMI du moniteur des sites distants
    projectorOutputId: 1,                     //Connecteur HDMI du projecteur
    usbOutputId: 2,                           //Connecteur HDMI du convertisseur HDMI->USB
    autoShareInputs:[2]                       //Inputs qui sont en autoshare
}
```
### config.audio
```
useCombinedAecReference:true,             //Utilise la nouvelle méthode de AEC (référence non connectée) <true, false>
```
