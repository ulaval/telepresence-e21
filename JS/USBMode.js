/*jshint esversion: 6 */
//VERSION:6.0

const xapi = require('xapi');
const Rkhelper = require('./Rkhelper');
const RoomConfig = require('./RoomConfig');

const DEBUG = false;

const USBMBUTTONID = 'p_usbmode';
const PROMPTENABLEUSBMODE1 = 'fbEnableUsbMode1';
const PROMPTENABLEUSBMODE1W = 'fbEnableUsbMode1w';
const CONFIRMWEBCONFERENCE = 'fbConfirmWebConference';
const PROMPTDISABLEUSBMODE = 'fbDisableUsbMode';
const MODE_RECORDING = 'MODE_RECORDING';
const MODE_WEBCONF = 'MODE_WEBCONF';
const MODE_NONE = 'MODE_NONE';
const ROLE_RECORDER = 'Recorder';
const ROLE_MATRIX = 'Auto';

/* CONFIG */
const AUTODISABLEONSLEEP = true;
const USBHDMICONNECTOR = RoomConfig.config.video.usbOutputId;
const CAMCONNECTOR = RoomConfig.config.camera.connector;
const EMPTYCONNECTOR = 5;
const VIDEODEVICENAME = 'Cisco USB ou INOGENI';
const AUDIODEVICENAME = 'Cisco USB ou INOGENI';
var pcAudioInputId;
var usbAudioOutputId;
var ceilingMicAudioInputId;



var currentUsbMode = MODE_NONE;


var usbmode_enabled, usbmode_disabled;

var presLocation;
var usbModeEnabled = false;
var privateModeActive = false;
var wakeupTimer;
var lastConnectedStatus = 'False';

async function getBootTime() {
  const uptime = await xapi.Status.SystemUnit.Uptime.get();
  return uptime;
}

function UsbModeButtonClicked() {
  if (usbModeEnabled) {
    displayDisableUsbMode();
  }
  else {
    displayEnableUsbMode1();
  }
}

function disableCallingFunctions() {
  xapi.Config.UserInterface.Features.Call.Start.set('Hidden');
  xapi.Config.UserInterface.Features.Call.JoinWebex.set('Hidden');
  xapi.Command.Call.Disconnect();
}
function enableCallingFunctions() {
  xapi.Config.UserInterface.Features.Call.Start.set(RoomConfig.config.room.callFeatures);
  xapi.Config.UserInterface.Features.Call.JoinWebex.set('Auto');
}

function wakeup() {
  xapi.Command.Standby.Deactivate();
}

function enableSleepPrevention() {
  if (DEBUG)
    console.log('enableSleepPrevention()');
  wakeupTimer = setInterval(wakeup, 60000);
}
function disableSleepPrevention() {
  if (DEBUG)
    console.log('disableSleepPrevention()');
  clearInterval(wakeupTimer);
}

function displayEnableUsbMode1() {
  if (RoomConfig.config.usbmode.showRecordingOption) {
    xapi.Command.UserInterface.Message.Prompt.Display({
      title: 'Mode USB',
      text: `Le mode USB vous permet d'utiliser ce système comme caméra et micro sur votre ordinateur.<p>Quelle disposition d'affichage voulez-vous utiliser ?`,
      feedbackid: 'fbEnableUsbMode1',
      duration: 0,
      'option.1': 'Disposition pour webconférence',
      'option.2': 'Disposition pour enregistrement',
      'option.3': 'Annuler'
    });
  }
  else {
    xapi.Command.UserInterface.Message.Prompt.Display({
      title: 'Mode USB',
      text: `Le mode USB vous permet d'utiliser ce système comme caméra et micro sur votre ordinateur pour utilisation dans un logiciel de webconférence.`,
      feedbackid: 'fbEnableUsbMode1w',
      duration: 0,
      'option.1': 'Activer le mode USB',
      'option.2': 'Annuler'
    });
  }
}

function displayDisableUsbMode() {
  xapi.Command.UserInterface.Message.Prompt.Display(
    {
      title: 'Mode USB',
      text: 'Souhaitez-vous désactiver le mode USB?',
      feedbackid: 'fbDisableUsbMode',
      duration: 0,
      'option.1': 'Désactiver',
      'option.2': 'Ne pas désactiver',
    });
}

function disableUsbMode() {
  lastConnectedStatus = 'False';

  /* update le nom du bouton */
  xapi.Command.UserInterface.Extensions.Panel.Update({
    PanelId: 'p_usbmode',
    Name: 'Activer mode USB'
  });

  /* Ajoute la fonction d'autoconnect du son remote */


  xapi.Command.Audio.LocalOutput.Update({
    AutoconnectRemote: 'Off',
    OutputId: usbAudioOutputId,
  });

  /* enlève le retour du son du groupe PC */
  xapi.Command.Audio.LocalOutput.DisconnectInput({
    InputId: pcAudioInputId,
    OutputId: usbAudioOutputId
  });

  xapi.Command.Audio.LocalOutput.DisconnectInput({
    InputId: ceilingMicAudioInputId,
    OutputId: usbAudioOutputId
  });



  usbModeEnabled = false;
  disableSleepPrevention();

  /* remet les fonctions d'appel */
  enableCallingFunctions();

  /* désactive la prévention de la veille */

  /* Envoie un message aux autres script pour signaler que le mode USB est désactivé */
  usbmode_disabled();

  /* Configure le rôle du moniteur à MATRIX */

  xapi.Config.Video.Output.Connector[USBHDMICONNECTOR].MonitorRole.set(ROLE_MATRIX);

  /* Reset la matrice */
  xapi.Command.Video.Matrix.Reset({
    Output: USBHDMICONNECTOR
  });

  /* Assigne un input vide à la matrice */
  xapi.Command.Video.Matrix.Assign({
    Layout: 'Equal',
    Mode: 'Replace',
    Output: USBHDMICONNECTOR,
    SourceId: EMPTYCONNECTOR
  });
}
async function enableUsbModeWebconf() {
  /*
  if (RoomConfig.config.room.autoEnablePresenterTrack) {
    console.log('Enabling camera 1 with presenter track');
    xapi.Command.Cameras.PresenterTrack.Set({
      Mode: 'Follow'
    });
  }
  else {
    console.log('Enabling camera 1 with preset Console');
    Rkhelper.System.Camera.getPresetId('Console').then(preset => {
      xapi.Command.Camera.Preset.Activate({ PresetId: preset.PresetId }).catch(() => { });
    }).catch(() => { });
  }
  */

  if (presLocation == 'local') {
    if (RoomConfig.config.room.autoEnablePresenterTrack) {
      xapi.Command.Cameras.PresenterTrack.Set({
        Mode: 'Follow'
      });
    }
    else {
      Rkhelper.System.Camera.getPresetId('Console').then(preset => {
        xapi.Command.Camera.Preset.Activate({ PresetId: preset.PresetId }).catch(() => { });
      });
    }
  }
  else {
    if (RoomConfig.config.room.useRoomPreset) {
      Rkhelper.System.Camera.getPresetId('Salle').then(preset => {
        xapi.Command.Camera.Preset.Activate({ PresetId: preset.PresetId }).catch(() => { });
      });
    }
  }


  /* update le nom du bouton */
  xapi.Command.UserInterface.Extensions.Panel.Update({
    PanelId: 'p_usbmode',
    Name: 'Désactiver mode USB'
  });

  /* enlève la fonction d'autoconnect du son remote */
  xapi.Command.Audio.LocalOutput.Update({
    autoconnectremote: 'off',
    Outputid: usbAudioOutputId
  });

  /* enlève le retour du son du groupe PC */
  xapi.Command.Audio.LocalOutput.DisconnectInput({
    InputId: pcAudioInputId,
    OutputId: usbAudioOutputId
  });

  xapi.Command.Audio.LocalOutput.ConnectInput({
    InputId: ceilingMicAudioInputId,
    OutputId: usbAudioOutputId
  });



  /* Change le rôle du moniteur à "AUTO" */
  xapi.Config.Video.Output.Connector[USBHDMICONNECTOR].MonitorRole.set(ROLE_MATRIX);

  /* Reset le video matrix */
  xapi.Command.Video.Matrix.Reset({
    Output: USBHDMICONNECTOR
  });

  let currentCamConnector = await getCurrentCameraConnector();

  /* Assigne la caméra comme source de la matrice */
  xapi.Command.Video.Matrix.Assign({
    Mode: 'Replace',
    Output: USBHDMICONNECTOR,
    SourceId: currentCamConnector
  });

  /* Déconnecte les appels */
  xapi.Command.Call.Disconnect();

  /* Envoie un message aux autres script pour signaler que le mode USB est activé */
  usbmode_enabled();
  usbModeEnabled = true;
  currentUsbMode = MODE_WEBCONF;

  /* Désactive les fonctions d'appel */
  disableCallingFunctions();

  /* Démarre la routine qui empêche le sleep */
  enableSleepPrevention();

  if (RoomConfig.config.usbmode.autoStartPresentationConnector) {
    xapi.Command.Presentation.Start({
      ConnectorId: RoomConfig.config.usbmode.autoStartPresentationConnector
    });
  }

}

function enableUsbModeRecording() {

  if (presLocation == 'local') {
    if (RoomConfig.config.room.autoEnablePresenterTrack) {
      xapi.Command.Cameras.PresenterTrack.Set({
        Mode: 'Follow'
      });
    }
    else {
      Rkhelper.System.Camera.getPresetId('Console').then(preset => {
        xapi.Command.Camera.Preset.Activate({ PresetId: preset.PresetId });
      });
    }
  }
  else {
    if (RoomConfig.config.room.useRoomPreset) {
      Rkhelper.System.Camera.getPresetId('Salle').then(preset => {
        xapi.Command.Camera.Preset.Activate({ PresetId: preset.PresetId });
      });
    }
  }

  usbModeEnabled = true;
  currentUsbMode = MODE_RECORDING;
  enableSleepPrevention();

  /* update le nom du bouton */
  xapi.Command.UserInterface.Extensions.Panel.Update({
    PanelId: 'p_usbmode',
    Name: 'Désactiver mode USB'
  });

  /* Ajoute la fonction d'autoconnect du son remote */
  xapi.Command.Audio.LocalOutput.Update({
    AutoconnectRemote: 'on',
    Outputid: usbAudioOutputId
  });

  /* Ajoute le retour du son du groupe PC */
  xapi.Command.Audio.LocalOutput.ConnectInput({
    InputId: pcAudioInputId,
    OutputId: usbAudioOutputId
  });

  xapi.Command.Audio.LocalOutput.ConnectInput({
    InputId: ceilingMicAudioInputId,
    OutputId: usbAudioOutputId
  });



  /* Change le rôle du moniteur à "RECORDER" */
  xapi.Config.Video.Output.Connector[USBHDMICONNECTOR].MonitorRole.set(ROLE_RECORDER);

  /* Reset le video matrix */
  xapi.Command.Video.Matrix.Reset({
    Output: USBHDMICONNECTOR
  });

  usbModeEnabled = true;
  currentUsbMode = MODE_RECORDING;

  if (RoomConfig.config.usbmode.autoStartPresentationConnector) {
    xapi.Command.Presentation.Start({
      ConnectorId: RoomConfig.config.usbmode.autoStartPresentationConnector
    });
  }

  /* Affiche les instructions */
  xapi.Command.UserInterface.Message.Prompt.Display({
    Title: 'ATTENTION!',
    Text: `Choisissez ${VIDEODEVICENAME} comme caméra et ${AUDIODEVICENAME} comme microphone dans votre application d'enregistrement préférée.`,
    FeedbackId: 'fbnull',
    Duration: 0,
    'Option.1': 'J\'ai compris'
  });

}



function privatemode_enabled() {
  privateModeActive = true;
  xapi.Command.UserInterface.Extensions.Panel.Update({
    PanelId: 'p_usbmode',
    Visibility: 'Hidden'
  });
}
function privatemode_disabled() {
  privateModeActive = false;
  xapi.Command.UserInterface.Extensions.Panel.Update({
    PanelId: 'p_usbmode',
    Visibility: 'Auto'
  });
}


async function init() {


  var bootTime = await getBootTime();
  if (bootTime > 99) {
      if (DEBUG)
    console.log(`USBMode: init()`);
    
    createUi();

    /* register remote calls */
    usbmode_enabled = Rkhelper.IMC.getFunctionCall('usbmode_enabled');
    usbmode_disabled = Rkhelper.IMC.getFunctionCall('usbmode_disabled');

    Rkhelper.IMC.registerFunction(privatemode_enabled);
    Rkhelper.IMC.registerFunction(privatemode_disabled);
    Rkhelper.IMC.registerFunction(disableUsbMode);


    /* get audio in/out ids */
    Rkhelper.Audio.getLocalInputId('PC').then(input => {
      pcAudioInputId = input;
      Rkhelper.Audio.getLocalInputId('Microphone').then(input => {
        ceilingMicAudioInputId = input;
        Rkhelper.Audio.getLocalOutputId('USB').then(output => {
          usbAudioOutputId = output;

          disableUsbMode();

        });
      });
    });



    /* Register feedback listeners */
    xapi.Event.UserInterface.Extensions.Panel.Clicked.on(event => {
      if (event.PanelId == USBMBUTTONID) {
        if (privateModeActive) {
          xapi.Command.UserInterface.Message.Prompt.Display({
            Title: 'Mode privé',
            Text: 'Vous ne pouvez pas activer le mode USB car le mode privé est activé.',
            FeedbackId: 'fbnull',
            Duration: 0,
            'Option.1': 'OK'
          });
        }
        else {
          UsbModeButtonClicked();
        }
      }
    });

    xapi.Event.UserInterface.Message.Prompt.Response.on(event => {
      if (DEBUG)
        console.log(event);
      if (event.FeedbackId == PROMPTDISABLEUSBMODE) {
        if (event.OptionId == 1) {
          disableUsbMode();
        }
      }
      else if (event.FeedbackId == PROMPTENABLEUSBMODE1) {
        if (event.OptionId == 1) {
          xapi.Command.UserInterface.Message.Prompt.Display({
            Title: 'Webconférence',
            Text: `L'activation du mode webconférence désactivera les fonctionnalités d'appel' et déconnectera tous les appels.`,
            FeedbackId: CONFIRMWEBCONFERENCE,
            Duration: 0,
            'Option.1': 'Continuer',
            'Option.2': 'Ne pas activer',
          });
        }
        if (event.OptionId == 2) {
          enableUsbModeRecording();
        }
      }
      else if (event.FeedbackId == PROMPTENABLEUSBMODE1W) {
        if (DEBUG)
          console.log('OK');
        if (event.OptionId == 1) {
          xapi.Command.UserInterface.Message.Prompt.Display({
            Title: 'Webconférence',
            Text: `L'activation du mode webconférence désactivera les fonctionnalités d'appel' et déconnectera tous les appels.`,
            FeedbackId: CONFIRMWEBCONFERENCE,
            Duration: 0,
            'Option.1': 'Continuer',
            'Option.2': 'Ne pas activer',
          });
        }
      }
      else if (event.FeedbackId == PROMPTDISABLEUSBMODE) {
        if (event.OptionId == 1) {
          //TODO: ????????????? 
        }
      }
      else if (event.FeedbackId == CONFIRMWEBCONFERENCE) {
        if (event.OptionId == 1) {
          /* Affiche les instructions */
          xapi.Command.UserInterface.Message.Prompt.Display({
            Title: 'Configuration de votre application',
            Text: `Choisissez "${VIDEODEVICENAME}" comme caméra et "${AUDIODEVICENAME}" comme microphone dans votre application de webconférence préférée.`,
            FeedbackId: 'fbnull',
            Duration: 0,
            'Option.1': 'J\'ai compris',
          });
          enableUsbModeWebconf();
        }
      }
    });


    xapi.Status.Standby.State.on(state => {
      if (state == 'Standby') {
        disableUsbMode();
      }
      else if (state == 'Off') {
        createUi();
      }
      else if (state == 'Halfwake') {
        //code ici
      }
    });


    //TODO
    /* refresh on status change */
    Rkhelper.Status.addStatusChangeCallback(function (status) {
      presLocation = status.presLocation;
      if (usbModeEnabled)
        setCamVideoMatrix();
    });
    /* refresh on cam change */
    xapi.Status.Video.Input.MainVideoSource.on(value => {
      if (usbModeEnabled)
        setCamVideoMatrix();
    });
  }
}

async function setCamVideoMatrix() {
  if (presLocation == 'local') {
    if (RoomConfig.config.room.autoEnablePresenterTrack) {
      xapi.Command.Cameras.PresenterTrack.Set({
        Mode: 'Follow'
      });
    }
    else {
      Rkhelper.System.Camera.getPresetId('Console').then(preset => {
        xapi.Command.Camera.Preset.Activate({ PresetId: preset.PresetId });
      });
    }
  }
  else {
    if (RoomConfig.config.room.useRoomPreset) {
      Rkhelper.System.Camera.getPresetId('Salle').then(preset => {
        xapi.Command.Camera.Preset.Activate({ PresetId: preset.PresetId });
      });
    }
  }

  setTimeout(async function () {
    let currentCamConnector = await getCurrentCameraConnector();
    xapi.Command.Video.Matrix.Assign({
      Mode: 'Replace',
      Output: USBHDMICONNECTOR,
      SourceId: currentCamConnector
    });
  }, 2000);

}

async function getCurrentCameraConnector() {
  return await xapi.Status.Video.Input.MainVideoSource.get();
}

//Write UI
function createUi() {
  xapi.Command.UserInterface.Extensions.Panel.Save({
    PanelId: 'p_usbmode'
  },
    `
<Extensions>
  <Version>1.8</Version>
  <Panel>
    <Order>${RoomConfig.config.ui.iconOrder.usbmode}</Order>
    <PanelId>p_usbmode</PanelId>
    <Origin>local</Origin>
    <Type>Home</Type>
    <Icon>Custom</Icon>
    <Color>#4287f5</Color>
    <Name>Activer mode USB</Name>
    <ActivityType>Custom</ActivityType>
    <CustomIcon>
      <Content>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</Content>
      <Id>c543a9711d9368ecc9a0231f20c7fec9205cd38aef825686205648f7c98a6a4a</Id>
    </CustomIcon>
  </Panel>
</Extensions>


`);
}

/* init delay 10s */
setTimeout(init, 10000);