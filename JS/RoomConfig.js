/*jshint esversion: 6 */
//VERSION:6.0

module.exports.config = {
  telemetry:{
    url:'http://10.1.48.100:8081',
    basepath:'systems/testvisio1',
    username:'1f87d7a681bd2',
    password:'MzA1MDkzMzg1MTAxNzA4Mzc4MTU5ODg3ODMxNjA1NTc1NjI'
  },
  extrasauce:{
    presenterMics: [
      {
        connector: 6,
        gains: [
          {
            gain: 64,
            silence: 20
          },
          {
            gain: 70,
            silence: 25
          },
          {
            gain: 'default',
            silence: 20
          }
        ]
      },
      {
        connector: 8,
        gains: [
          {
            gain: 56,
            silence: 15
          },
          {
            gain: 70,
            silence: 25
          },
          {
            gain: 'default',
            silence: 15
          }
        ]
      }
    ],
    roomMics: [
      {
        connector: 1,
        gain: 51
      },
      {
        connector: 2,
        gain: 51
      },
      {
        connector: 3,
        gain: 51
      }
    ],
    roomMicsBoost: 10
  },
  ui:{
    iconOrder:{ //Détermine l'ordre des icônes
      zoom:1,
      usbmode:2,
      settings:3,
      shutdown:4
    }
  },
  room: {
    name: 'PVE1115',                        //Nom du système, doit être unique
    supportContact: 'Courriel: zacharie.gignac.1@ulaval.ca',     //Email du soutien technique, '' si aucun
    displayControl: true,                   //Active le contrôle des affichages
    lightsControl: true,                    //Mode automatique de gestion de la salle <true, false>
    motorizedScreen: true,                  //Active le contrôle de la toile motorisée
    boardBehindScreen: true,                //Est-ce que le tableau est caché par l'écran motorise ? <true, false>
    tvOffDelay: 5000,                       //Temps avant la fermeture de la TV (MS)
    projOffDelay: 20000,                  //Temps avant la fermeture du projecteur (MS)
    loadingDelay: 5000,                     //Délais avant l'initialisation des scripts en ms. Défaut: 200000 (MS) (3 minutes 20 secondes)
    controlSystemPollingInterval: 5000,     //Temps entre chaque vérification du système de contrôle (Crestron)
    fakeControlSystem: true,                //false = normal, true = developement
    controlSystemSerial: '1234567890',     //numéro de série du processeur crestron
    showActivities: true,                    //Affiche la liste des activités
    defaultActivity: 'normal',               //Activité par défaut (normal par défaut)
    defaultPresenterLocation: 'local',       //Emplacement par défaut du présentateur (local, remote, none)
    autoEnablePresenterTrack: true,          //Active automatiquement le PresenterTrack lorsque possible et utile
    remotePresenterPIPPosition: 'UpperRight',//Emplacement du PIP quand présentateur distant <CenterLeft, CenterRight, LowerLeft, LowerRight, UpperCenter, UpperLeft, UpperRight>
    callFeatures: 'Auto',
    useRoomPreset:true,
    activities: [                            //Activités. L'activité "normal" DOIT être présente même si elle n'est pas affichée
      {
        id: 'normal',                        //id de l'activité
        name: 'Normal'                       //Nom courant de l'activité
      },
      {
        id: 'writeonboard',                  //id de l'activité
        name: 'Écrire au tableau'            //Nom courant de l'activité
      }
    ]
  },
  usbmode: {
    showRecordingOption: false,               //Affiche l'option "Enregistrement" dans le mode USB <true, false>
    localPcInput1:4,                          //Entrée 1 pc local
    localPcInput2:3,                          //Entrée 2 pc local
    autoStartPresentationConnector:2          //Démarre la présentation automatiquement en utilisant ce connecteur
  },
  zoom: {
    callHistoryAutoDelete: true,              //Effacement automatique du call history
    callHistoryAutoDeleteMethod: 'AUTODELETEMETHOD_ONDISCONNECT', //AUTODELETEMETHOD_ONDISCONNECT ou AUTODELETEMETHOD_ONSTANDBY
    callHistoryAutoDeleteTimeout: 30000       //Délais avant l'effacement du call history
  },
  camera: {
    connector: 1,
    defaultBrightness: 20                    //Brightness par défaut de la caméra
  },
  dnd: {
    strict: true,                            //Force le mode "Do Not Disturb" avec période de grâce
    offTime: 10,                               //Temps avant que le DND se réactive (minutes)
  },
  video: {
    remoteMonitorOutputId: 3,                 //Connecteur HDMI du moniteur des sites distants
    projectorOutputId: 1,                     //Connecteur HDMI du projecteur
    usbOutputId: 2,                           //Connecteur HDMI du convertisseur HDMI->USB
    autoShareInputs:[2]                       //Inputs qui sont en autoshare
  },
  audio: {
    loud: 6,                                  //Nombre de DB à additionner pour le mode "Fort"
    louder: 12,                                //Nombre de DB à additionner pour le mode "Très fort"
    inputs: [
      {
        name: 'Sans-fil (casque)',        //Nom de l'entrée audio
        connector: 6,                         //Numéro de connecteur
        normal: 54,                           //Volume normal en DB
        defaultMode: 'normal'                 //Mode par défaut (mute, normal, loud, louder)
      }
    ],
    maxVolume: 100,                            //Volume maximal du système <0 - 100>
    defaultVolume: 60                          //Volume par défaut <0 - 100>
  },

  lights: {                                    //Configuration de l'éclairage
    zones: [
      {
        name: 'Tableau',                         //Nom affiché dans l'interface graphique
        id: 'lights_zone2',                    //ID interne envoyé au contrôleur de lumières
        show: true,                            //Affichages des controles de lumières dans l'onglet "Éclairage"
        type: 'dim',                           //Type d'éclairage <dim, onoff>
        state: 'on',                           //État par défaut (on, off)
        level: 100,                            //Niveau par défaut <0 - 100>
        steps: 10                              //Pourcentage d'incrémentation

      },
      {
        name: 'Étudiants',
        id: 'lights_zone1',
        show: true,
        type: 'dim',
        state: 'on',
        level: 100,
        steps: 10
      },
      {
        name: 'Console',
        id: 'lights_zone3',
        show: true,
        type: 'dim',
        state: 'off',
        level: 0,
        steps: 10
      }
    ],
    scenes: [                                    //Configuration des scènes d'éclairage
      {
        name: 'Normal',                          //Nom courant de la scène
        id: 'scene_normal',                      //id de la scène
        show: true,                              //Affichage du bouton <true, false>
        presets: [                               //Liste des affichages à modifier
          {
            zone: 'lights_zone1',                //id de la zone à modifier
            state: 'on',                         //État de la zone
            level: 100                           //Niveau de la zone
          },
          {
            zone: 'lights_zone2',
            state: 'on',
            level: 100
          },
          {
            zone: 'lights_zone3',
            state: 'on',
            level: 100
          }
        ]
      },
      {
        name: 'Projection',
        id: 'scene_projection',
        show: true,
        presets: [
          {
            zone: 'lights_zone1',
            state: 'on',
            level: 75
          },
          {
            zone: 'lights_zone2',
            state: 'on',
            level: 50
          },
          {
            zone: 'lights_zone3',
            state: 'on',
            level: 80
          }
        ]
      },
      {
        name: 'Écriture tableau',
        id: 'scene_board',
        show: true,
        presets: [
          {
            zone: 'lights_zone1',
            state: 'on',
            level: 100
          },
          {
            zone: 'lights_zone2',
            state: 'on',
            level: 100
          },
          {
            zone: 'lights_zone3',
            state: 'on',
            level: 100
          }
        ]
      },
      {
        name: 'Obscurité',
        id: 'scene_blackout',
        show: true,
        presets: [
          {
            zone: 'lights_zone1',
            state: 'off',
            level: 0
          },
          {
            zone: 'lights_zone2',
            state: 'off',
            level: 0
          },
          {
            zone: 'lights_zone3',
            state: 'off',
            level: 0
          }
        ]
      }
    ]
  }
};