/*jshint esversion: 6 */
//VERSION:6.0

const xapi = require('xapi');
const Rkhelper = require('./Rkhelper');
const RoomConfig = require('./RoomConfig');
const Settings = require('./Settings');
const Displays = require('./Displays');
const Lights = require('./Lights');
const Scenarios = require('./Scenarios');


const DEBUG = false;

const TGL_AUTODISPLAYMODE = 'tgl_autodisplaymode';
const TGL_AUTOLIGHTSMODE = 'tgl_autolightsmode';
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


    //nouvelle méthode
    var autodisplaymodetoggle = new Rkhelper.UI.Toggle(TGL_AUTODISPLAYMODE);
    autodisplaymodetoggle.onChange(value => {
      let loadingPrompt;
      loadingPrompt = Rkhelper.UI.perminfo.display(`Un instant s.v.p.`, `Changement de mode`);
      if (value == 'off') {
        this.autoDisplay = false;
      }
      else {
        this.autoDisplay = true;
      }
      setTimeout(function () { Rkhelper.UI.clearPrompt(loadingPrompt); }, 3000);
    });

    var autolightsmodetoggle = new Rkhelper.UI.Toggle(TGL_AUTOLIGHTSMODE);
    autolightsmodetoggle.onChange(value => {
      let loadingPrompt;
      loadingPrompt = Rkhelper.UI.perminfo.display(`Un instant s.v.p.`, `Changement de mode`);
      if (value == 'off') {
        this.autoLights = false;
      }
      else {
        this.autoLights = true;
      }
      setTimeout(function () { Rkhelper.UI.clearPrompt(loadingPrompt); }, 3000);
    });

    xapi.Event.UserInterface.Extensions.Widget.Action.on(action => {
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
        }
      }
    });

    xapi.Status.Standby.State.on(value => {
      if (value == 'Standby') {
        this.autoDisplay = RoomConfig.config.room.displayControl;
        this.autoLights = RoomConfig.config.room.lightsControl;
        this.tvOff();
        this.projOff();
        this.screenUp();
      }
    });


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
    {
      if (this.autoLights && RoomConfig.config.room.lightsControl) {
        this.lights.activateLightScene(scene);
      }
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
  <Version>1.8</Version>
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
          xapi.Command.UserInterface.Message.Prompt.Display(
            {
              Duration: 6,
              FeedbackId: 'standbymessage',
              Text: 'Aurevoir, à la prochaine!',
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
    Text: `Démarrage de l'application en cours...`,
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


//Stop sharing on disconnect
xapi.Event.CallDisconnect.on(value => {
  setTimeout(function () {
    xapi.Command.Presentation.Stop();
  }, 6000);
});


xapi.Status.Standby.State.on(async value => {
  var bootTime = await getBootTime();
  if (bootTime > 100) {
    if (value == 'Off') {

      setTimeout(() => {
        xapi.Command.UserInterface.Message.Prompt.Display(
          {
            Duration: 5,
            FeedbackId: 'wakemessage',
            Text: 'Préparation du système, un instant s.v.p!',
            Title: `Nouvelle session`
          });

        createUi();
      }, 2000);
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
    msg = `Le système démarre. Ceci ne prendra que deux minutes...`
  }
  else {
    msg = `Le système sera prêt dans quelques instants...`
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