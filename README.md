# telepresence-e21
Projet servant a partager les scripts d'automatisation des appareils de Cisco Webex Room Kit

# Installation
* AVANT TOUTE CHOSE: FAIRE UN BACKUP DE ce-audio-config.js ET DE RoomConfig.js!!!
* Mettre à OFF toute les macros SAUF ce-audio-config.js
* Importer toute les macros
* Sauvegarder chaque script (ignorer les erreurs)
* Ajouter les configurations pour la télémétrie dans RoomConfig.js (Nouvelle section 'telemetry'):
```JS
  telemetry:{
    url:'http://telemetrie.mavc.ulaval.ca:8081',
    basepath:'systems/<nom du système ici>',
    username:'app id ici',
    password:'app secret ici'
  },
```
* Activer seulement les scripts suivants:
  * ce-audio-config
  * JoindreZoom
  * RoomController
  * Telemetry
  * USBMode **OU** USBModeDual
  * AutoReboot (AU BESOIN)
  * ExtraSauce (AU BESOIN). Si ExtraSauce est utilisé, une nouvelle section doit être ajoutée à RoomConfig.js. Un modèle de cette section se trouve dans le fichier ExtraSauce.js
```JS
extrasauce:{}
```
* Sauvegarder n'importe quel script (ctrl+s) une dernière fois
* Rebooter le système quand tout est OK

# Erreurs ce-audio-config
Si des erreurs d'execution du script ce-audio-config surviennent
* Essayer de remplacer le CONTENU du script par celui que vous avez pris en backup, sinon
* Supprimer toute la configuration de audio-console et réapliquer le script que vous avez pris en backup

# Ménage
Dans RoomConfig.js, enlever:
```JS
module.exports.config.scenarios
```
