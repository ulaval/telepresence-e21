/*jshint esversion: 6 */
const xapi = require('xapi');
const Rkhelper = require('./Rkhelper');
const RoomConfig = require('./RoomConfig');
const Settings = require('./Settings');
const Displays = require('./Displays');
const Lights = require('./Lights');
const Scenarios = require('./Scenarios');


const DEBUG = false;

const TGL_AUTOLIGHTSMODE = 'tgl_autolightsmode';
const TGL_AUTODISPLAYMODE = 'tgl_autodisplaymode';
const TGL_PRESTRACKWARN = 'tgl_prestrackwarn';
const CMD_MONITOR_ON = 'cmdmonitoron';
const CMD_MONITOR_OFF = 'cmdmonitoroff';
const CMD_PROJECTOR_ON = 'cmdprojectoron';
const CMD_PROJECTOR_OFF = 'cmdprojectoroff';
const STATUS_AWAKE = 'Off';
const TVPOWER = 'tvpower';
const PROJPOWER = 'projpower';
const SCREENSTOP = 'screen_stop';
const SCREENUP = 'screen_up';
const SCREENDOWN = 'screen_down';


/* Fichier de mise en place et de configuration de l'environnement.
NE PAS MODIFIER
NE PAS MODIFIER
NE PAS MODIFIER
NE PAS MODIFIER
NE PAS MODIFIER
NE PAS MODIFIER
*/


var enablePrivateMode;
var disablePrivateMode;
var enableUsbMode;
var disableUsbMode;
var UsbModeEnabled;
var UsbModeDisabled;

var usbModeActive = false;
var inCall = false;
var presTrackWarn = RoomConfig.config.room.presenterTrackWarningDisplay;

var csConnected = false;

var loadingPrompt;
var controlSystemWaiting;

var scenarios;
var disableCustomScenario;

var statusChanged;

var controller;
var lights;

var macroRestartTimeout;
var alternateUpdateMessage = false;
var freshBootWarningInterval;

class Controller {
  constructor() {
    const that = this;
    this.currentScenario = undefined;
    this.autoDisplay = true;
    this.autoLights = true;
    this.disp_tv = new Displays.TV(this);
    this.disp_proj = new Displays.Projector(this);
    this.disp_screen = new Displays.Screen(this);
    this.lights = new Lights.Lights(this);


    var autolightsmodetoggle = new Rkhelper.UI.Toggle(TGL_AUTOLIGHTSMODE);
    autolightsmodetoggle.onChange(value => {
      if (value == 'off') {
        this.autoLights = false;
      }
      else {
        this.autoLights = true;
        Rkhelper.Status.notifyChange();
      }
    });

    xapi.Event.UserInterface.Extensions.Widget.Action.on(action => {
      if (action.Type == 'changed') {
        switch (action.WidgetId) {
          case TGL_PRESTRACKWARN:
            presTrackWarn = action.Value == 'on' ? true : false;
            break;
        }
      }
      if (action.Type == 'pressed') {
        switch (action.WidgetId) {
          case TVPOWER:
            if (action.Value == 'on') {
              this.disp_tv.on();
            }
            else {
              this.disp_tv.off(true);
            }
            break;

          case PROJPOWER:
            if (action.Value == 'on') {
              this.disp_proj.on();
            }
            else {
              this.disp_proj.off(true);
            }
            break;

          case SCREENSTOP:
            this.disp_screen.stop();
            break;

          case SCREENUP:
            this.disp_screen.up();
            break;

          case SCREENDOWN:
            this.disp_screen.down();
            break;

          case TGL_AUTODISPLAYMODE:
            if (action.Value == 'on') {
              this.autoDisplay = true;
            }
            else {
              this.autoDisplay = false;
            }
            break;

          case CMD_MONITOR_ON:
            this.tvOn(true);
            break;
          case CMD_MONITOR_OFF:
            this.tvOff(true);
            break;
          case CMD_PROJECTOR_ON:
            this.projOn(true);
            break;
          case CMD_PROJECTOR_OFF:
            this.projOff(true);
            break;
        }
      }
    });

    xapi.Command.UserInterface.Message.TextLine.Clear();

    if (RoomConfig.config.room.presenterTrackWarningDisplay) {
      xapi.Status.Cameras.PresenterTrack.PresenterDetected.on(pd => {
        if ((inCall || usbModeActive) && presTrackWarn) {
          xapi.Status.Cameras.PresenterTrack.Status.get().then(status => {
            if ((pd == 'False' && status == 'Follow')) {
              xapi.Command.UserInterface.Message.TextLine.Display({
                Text: '🔴 Cadrage automatique DÉSACTIVÉ 🔴.<br>Revenez dans la zone de présentation pour le réactiver.',
                Duration: 0
              });
            }
            else if (pd == 'True' && status == 'Follow') {
              xapi.Command.UserInterface.Message.TextLine.Display({
                Text: '🟢 Cadrage automatique ACTIVÉ 🟢',
                Duration: 3
              });
            }
          });
        }
        else {
          xapi.Command.UserInterface.Message.TextLine.Clear();
        }
      });
    }

    /*
        xapi.Status.Standby.State.on(value => {
          if (value == 'Standby') {
            this.autoDisplay = RoomConfig.config.room.displayControl;
            this.autoLights = RoomConfig.config.room.lightsControl;
            this.tvOff();
            this.projOff();
            this.screenUp();
          }
        });
    */

    xapi.Event.Message.Send.on(message => {
      message = message.Text;
      if (message.split(' ')[0] == 'activateLightScene') {
        this.activateLightScene(message.split(' ')[1]);
      }
    });



  }

  getSystemStatus() {
    return Rkhelper.Status.getSystemStatus();
  }
  test() {
    if (DEBUG)
      console.log('Controller test.');
  }
  tvOn(force) {
    if (force || this.autoDisplay) {
      this.disp_tv.on();
      this.displayStatus();
    }
  }
  tvOff(force, nodelay) {
    if (force || this.autoDisplay) {
      this.disp_tv.off(nodelay);
      this.displayStatus();
    }
  }
  projOn(force) {
    if (force || this.autoDisplay) {
      this.disp_proj.on();
      this.displayStatus();
    }
  }
  projOff(force, nodelay) {
    if (force || this.autoDisplay) {
      this.disp_proj.off(nodelay);
      this.displayStatus();
    }
  }
  screenUp(force) {
    if (force || this.autoDisplay) {
      this.disp_screen.up();
      this.displayStatus();
    }
  }
  screenDown(force) {
    if (force || this.autoDisplay) {
      this.disp_screen.down();
      this.displayStatus();
    }
  }
  screenStop(force) {
    if (force || this.autoDisplay) {
      this.disp_screen.stop();
      this.displayStatus();
    }
  }

  activateLightScene(scene) {
    if (this.autoLights && RoomConfig.config.room.lightsControl) {
      this.lights.activateLightScene(scene);
    }
  }
  setCurrentScenario(name) {
    this.currentScenario = name;
    this.displayStatus();
  }
  displayStatus() {
    Rkhelper.Status.getSystemStatus().then(sys => {
      const status = `ACT:${sys.activity} - PRESLOC:${sys.presLocation} - PRES:${sys.presentationStatus.presentationType} - TV:${this.disp_tv.getStatus()} - PROJ:${this.disp_proj.getStatus()} - SCR:${this.disp_screen.getStatus()}`;
      if (DEBUG)
        console.log(status);
      if (DEBUG) {
        xapi.Command.Video.Graphics.Text.Display({
          text: status,
          duration: 5
        });
      }
    });
  }
}
module.exports.Controller = Controller;



function privatemode_enabled() {
  if (DEBUG)
    console.log('Private Mode is enabled.');
}
function privatemode_disabled() {
  if (DEBUG)
    console.log('Private Mode is disabled.');
}





function createUi() {
  //Ajoute le bouton "Terminer la session"
  xapi.command('UserInterface Extensions Panel Save', {
    PanelId: 'endSession'

  }, `
  <Extensions>
  <Version>1.9</Version>
  <Panel>
    <Order>${RoomConfig.config.ui.iconOrder.shutdown}</Order>
    <PanelId>endSession</PanelId>
    <Type>Home</Type>
    <Icon>Power</Icon>
    <Color>#FF0000</Color>
    <Name>Fermer le système</Name>
    <ActivityType>Custom</ActivityType>
  </Panel>
</Extensions>
`);
}


function tvOn(force) {
  controller.disp_tv.on(force);
}
function tvOff(force) {
  controller.disp_tv.off(force);
}
function projOn(force) {
  controller.disp_proj.on(force);
}
function projOff(force) {
  controller.disp_proj.off(force);
}
function screenUp(force) {
  controller.disp_screen.up(force);
}
function screenDown(force) {
  controller.disp_screen.down(force);
}
function controllerStandbyRequest() {
  Rkhelper.UI.prompt.display({
    Duration: 8,
    Title: `Fin de session`,
    Text: `Votre session se terminera et tous les paramètres du système seront réinitialisés.<br>Voulez-vous continuer ?`,
    Options: [
      {
        id: 'endSessionContinue',
        label: 'Oui, fermer la session',
        callback: function () {
          xapi.Command.Presentation.Stop();
          xapi.Command.Call.Disconnect();
          controller.lights.activateLightScene('scene_normal', true);
          xapi.Command.UserInterface.Message.Prompt.Display(
            {
              Duration: 6,
              FeedbackId: 'standbymessage',
              Text: 'Aurevoir, à la prochaine!<br>',
              Title: `Fermeture de la session...`
            });
          setTimeout(function () {
            xapi.Command.Standby.Activate();
          }, 6000);
        }
      },
      {
        id: 'endSessionCancel',
        label: 'Non, annuler',
        callback: function () { }
      }
    ]
  },
    cancel => {

    });
}

async function loadingStart() {
  xapi.Command.UserInterface.Message.Prompt.Display({
    Duration: 10,
    FeedbackId: 'loadingstart',
    Text: `Démarrage de l'application en cours...<br>`,
    Title: `Un instant s.v.p.`
  });
  setTimeout(loadingEnd, RoomConfig.config.room.loadingDelay);
}

function loadingEnd() {


  Settings.init(controller);

  //Register external functions 
  enablePrivateMode = Rkhelper.IMC.getFunctionCall('privatemode_enable');
  disablePrivateMode = Rkhelper.IMC.getFunctionCall('privatemode_disable');
  enableUsbMode = Rkhelper.IMC.getFunctionCall('usbmode_enable');
  disableUsbMode = Rkhelper.IMC.getFunctionCall('usbmode_disable');
  UsbModeEnabled = Rkhelper.IMC.getFunctionCall('usbmode_enabled');
  UsbModeDisabled = Rkhelper.IMC.getFunctionCall('usbmode_disabled');
  disableCustomScenario = Rkhelper.IMC.getFunctionCall('disableCustomScenario');

  //Register callbacks 
  Rkhelper.IMC.registerFunction(ui_InitDone);
  Rkhelper.IMC.registerFunction(privatemode_enabled);
  Rkhelper.IMC.registerFunction(privatemode_disabled);
  Rkhelper.IMC.registerFunction(tvOn);
  Rkhelper.IMC.registerFunction(tvOff);
  Rkhelper.IMC.registerFunction(projOn);
  Rkhelper.IMC.registerFunction(projOff);
  Rkhelper.IMC.registerFunction(screenUp);
  Rkhelper.IMC.registerFunction(screenDown);



  createUi();



  xapi.Event.UserInterface.Extensions.Panel.Clicked.on(panel => {
    if (panel.PanelId == 'endSession') {
      controllerStandbyRequest();
    }
  });



  disablePrivateMode();


  xapi.Config.UserInterface.SettingsMenu.Mode.set('Locked');

  if (!RoomConfig.config.room.fakeControlSystem) {
    setInterval(checkControlSystem, RoomConfig.config.room.controlSystemPollingInterval);
  }

  xapi.Command.Standby.Activate();
}


async function checkControlSystem() {
  var found = false;
  xapi.Status.Peripherals.ConnectedDevice.get().then(p => {
    for (var peripheral of p) {
      if (peripheral.SerialNumber == RoomConfig.config.room.controlSystemSerial && peripheral.Status == 'Connected') {
        found = true;
      }
    }
    if (!found) {
      xapi.Command.UserInterface.Message.Prompt.Display({
        Duration: 10,
        FeedbackId: 'checkcontrolsystem',
        Text: 'Le processeur de contrôle de la salle ne réponds pas.<br>Avisez votre centre de service.',
        Title: 'SYSTÈME NON PRÊT'
      });
    }
  });
}


function configureRkhelper() {
  Rkhelper.System.DND.setDndConfig(RoomConfig.config.dnd);
}


function ui_InitDone() {
  if (DEBUG)
    console.log('UI init is done.');
}


async function init() {
  if (RoomConfig.config.room.controlSystemSyncReboot) {
    xapi.Event.BootEvent.Action.on(action => {
      if (action == 'Restart') {
        xapi.Command.Message.Send({ text: RoomConfig.config.room.controlSystemRebootCommand });
      }
    });
  }
  var bootTime = await getBootTime();
  if (bootTime > 100) {

    if (DEBUG)
      console.log(`RoomConfig: init()`);

    controller = new Controller();
    scenarios = new Scenarios.Scenarios(controller);
    configureRkhelper();
    loadingStart();
  }
}


async function getBootTime() {
  const uptime = await xapi.Status.SystemUnit.Uptime.get();
  return uptime;
}


xapi.Status.Video.Output.HDMI.Passthrough.Status.on(status => {
  if (status == 'Inactive') {
    usbModeActive = false;
    UsbModeDisabled();
     xapi.Command.UserInterface.Message.TextLine.Clear();
    setTimeout(() => {
      Rkhelper.System.DND.enable();
    }, 2000);
  }
  else if (status == 'Active') {
    usbModeActive = true;
    UsbModeEnabled();
    if (RoomConfig.config.room.autoEnablePresenterTrack) {
      setTimeout(() => {
        xapi.Command.Cameras.PresenterTrack.Set({
          Mode: 'Follow'
        });
      }, 2000);
    }
  }
});

//Stop sharing on disconnect
xapi.Event.CallDisconnect.on(value => {
  inCall = false;
   xapi.Command.UserInterface.Message.TextLine.Clear();
  setTimeout(function () {
    xapi.Command.Presentation.Stop();
  }, 6000);
});
xapi.Event.CallSuccessful.on(() => inCall = true);


xapi.Status.Standby.State.on(async value => {
  var bootTime = await getBootTime();
  if (bootTime > 100) {
    if (value == 'Off') {
      presTrackWarn = RoomConfig.config.room.presenterTrackWarningDisplay;
      xapi.Command.UserInterface.Extensions.Widget.SetValue({
        WidgetId: 'tgl_prestrackwarn',
        Value: RoomConfig.config.room.presenterTrackWarningDisplay ? 'On' : 'Off'
      });
      controller.lights.activateLightScene('scene_normal', true);
      setTimeout(() => {
        xapi.Command.UserInterface.Message.Prompt.Display(
          {
            Duration: 7,
            FeedbackId: 'wakemessage',
            Text: 'Préparation du système, un instant s.v.p!<br>',
            Title: `Nouvelle session`
          });
        createUi();
      }, 100);
    }
    else if (value == 'Standby') {
      controller.autoDisplay = RoomConfig.config.room.displayControl;
      controller.autoLights = RoomConfig.config.room.lightsControl;
      controller.tvOff();
      controller.projOff();
      controller.screenUp();
      controller.lights.activateLightScene('scene_normal', true);
    }
  }
  else {
    if (freshBootWarningInterval == undefined) {
      freshBootWarningInterval = setInterval(() => {
        displayFreshBootWarning();
        if (macroRestartTimeout == undefined) {
          clearTimeout(macroRestartTimeout);
          macroRestartTimeout = setTimeout(() => {
            xapi.Command.Macros.Runtime.Restart();
          }, 120000);
        }
      }, 5000);
    }
  }
});

function displayFreshBootWarning() {
  var msg;
  alternateUpdateMessage = !alternateUpdateMessage;
  if (alternateUpdateMessage) {
    msg = `Le système démarre. Ceci ne prendra que deux minutes..<br>`;
  }
  else {
    msg = `Le système sera prêt dans quelques instants...<br>`;
  }
  xapi.Command.UserInterface.Message.Prompt.Display(
    {
      Duration: 0,
      FeedbackId: 'freshboot',
      Text: msg,
      Title: `⚠ Démarrage du système ⚠`
    });
}



setTimeout(init, 11000);