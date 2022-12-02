# VERSION 7.0.0 - Guide d'installation

# Backup de sécurité
* Se connecter à l'interface web du codec à travers Control Hub
* Aller dans la section "Macro Editor"
* Télécharger toute les macros sur votre ordinateur
* Aller dans la section "Backup and Recovery"
* Dans l'onglet "Backup", décocher tout sauf "Configuration" et cliquer sur "Download"

# Supression de la version actuelle
* Aller dans la section "Macro Editor"
* Mettre toute les macros à OFF sauf "ce-audio-config"
* Supprimer toute les macros sauf "ce-audio-config" et "RoomConfig"
* Aller dans la section "UI Extensions Editor"
* Supprimer tout les panels

# Préparation pour la nouvelle version
## Configurations
### Avec la macro PREPARE-UPGRADE
* Ajouter la macro PREPARE-UPGRADE et executez-la.
* Supprimer la macro si tout s'est bien passé
### Sans la macro PREPARE-UPGRADE
* Aller dans la section "Personalization"
* Ajouter le fond d'écran noir comme "Wallpaper"
* Aller dans la section "Settings"
* Dans la sous-section "Video"
  * Mettre "Monitors" à "DualPresentationOnly"
  * Mettre "Output/Connector 1/MonitorRole" à "Second"
  * Mettre "Output/Connector 2/MonitorRole" à "Auto"
  * Mettre "Output/Connector 3"MonitorRole" à "First"
  * (pas au comtois) Mettre "Video/Output HDMI Passthrough/Allowed" à "True"
  * (pas au comtois) Mettre "Video/Output HDMI Passthrough/OutputCOnnector" à "2"
  * (pas au comtois) Mettre "Video/Output HDMI Passthrough/AutoDisconnect/Delay" à "480"
  * (pas au comtois) Mettre "Video/Output HDMI Passthrough/Enabled" à "True"
* Dans la sous-section "UserInterace"
  * Mettre "Help Tips" à "Hidden"
  * (pas au comtois) Mettre "HdmiPassthrough" à "Auto"
  * Mettre "JoinGoogleMeet" à "Hidden"
  * Mettre "JoinZoom" à "Hidden"
## RoomConfig
* Aller dans la section "Macro Editor"
* Ouvrir le fichier "RoomConfig"
* Supprimer ```module.exports.config.usbmode.showRecordingOption```
* Supprimer ```module.exports.config.audio.useCombinedAecReference```
* Supprimer ```module.exports.config.telemetry```
* Supprimer ```module.exports.config.room.supportContact```
* Ajouter ```module.exports.config.audio.roomMics``` et y ajouter un array d'input comme valeur (selon les micros dans la salle)
  * Exemple: ```roomMics:[1,2,3]```
* Si la salle est équipée d'éclairage controlable, ajouter ```module.exports.config.room.showLightsIcon```
  * Exemple: ```showLightsIcon:true```
* Ajouter ```module.exports.config.room.controlSystemSyncReboot```
  * Exemple: ```controlSystemSyncReboot:true```
* Ajouter ```module.exports.config.room.controlSystemRebootCommand```
  * Exemple (pour Crestron): ```controlSystemRebootCommand:'SYSTEM_CRESTRON_REBOOT'```
  * Exemple (pour RaspberryPi): ```controlSystemRebootCommand:'HW_RESET'```
* Ajouter ```module.exports.config.room.presenterTrackWarningDisplay```
  * Exemple: ```presenterTrackWarningDisplay:true```
* Ajouter "Micro" ou "Entrée" devant les noms des entrées audio dans ```module.exports.config.audio.inputs```
* Modifier la valeur de ```module.exports.config.version``` à ```7.0.0```
* Vérifier que le nom du système concorde dans ```module.exports.config.room.name``` exemple: ```CSL1640```

# Installation de la nouvelle version
* Aller dans la section "Macro Editor"
* Importer toute les macros de la nouvelle version sauf "ce-audio-config" et "RoomConfig"
* Sauvegarder toute les macros et ignorer les erreurs si il y en a
* Activer les macros
  * JoindreZoom
  * RoomController
  * USBModeDual pour le comtois
  * AutoReboot pour le comtois
* Sur l'écran tactile, appuyer sur "Appel", et composer le numéro "." (point)
  * Écrire la commande: restart macros
  * Appuyer sur "Executer"
  * Le système se met en veille. Attendre environ 10 secondes
* Tester en vérifiant si des erreurs surviennent dans le "Macro Editor"
* Vérifier si les 3 presets de caméra sont présent:
  * Console -> Zone de présentation
  * Tableau -> Tableau en entier
  * Salle -> Le plus de places dans la salle

# Dépannage, erreurs, bugs, etc...
**ARRÊTER IMMÉDIATEMENT. NE TOUCHEZ PLUS À RIEN.**

N'essayez pas de régler le problème si vous ne savez pas c'est quoi. 

Prendre un screenshot, une photo de l'écran tactile, etc...

Contactez-moi.