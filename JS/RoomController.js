import xapi from 'xapi';
import * as Rkhelper from './Rkhelper';
import * as RoomConfig from './RoomConfig';
import * as Settings from './Settings';
import * as Scenarios from './Scenarios';
import * as Displays from './Displays';
import * as Lights from './Lights';

const DEBUG = false;

const TGL_AUTODISPLAYMODE = 'tgl_autodisplaymode';
const TGL_AUTOLIGHTSMODE = 'tgl_autolightsmode';
const STATUS_AWAKE = 'Off';
const TVPOWER = 'tvpower';
const PROJPOWER = 'projpower';
const SCREENSTOP = 'screen_stop'
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

var ready;
var notready;
var csConnected = false;

var loadingPrompt;
var controlSystemWaiting;

var scenarios;
var disableCustomScenario;

var statusChanged;

var controller;
var lights;



export class Controller {
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
      setTimeout(function () { Rkhelper.UI.clearPrompt(loadingPrompt) }, 3000);
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
      setTimeout(function () { Rkhelper.UI.clearPrompt(loadingPrompt) }, 3000);
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
  ready() {
    this.disp_tv.ready();
    this.disp_proj.ready();
    this.disp_screen.ready();
  }
  notReady() {
    this.disp_tv.notReady();
    this.disp_proj.notReady();
    this.disp_screen.notReady();
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



function privatemode_enabled() {
  if (DEBUG)
    console.log('Private Mode is enabled.');
}
function privatemode_disabled() {
  if (DEBUG)
    console.log('Private Mode is disabled.');
}



async function loadingStart() {
  ready = Rkhelper.IMC.getFunctionCall('ready');
  notready = Rkhelper.IMC.getFunctionCall('notready');



  const systemName = await Rkhelper.getSystemName();
  loadingPrompt = Rkhelper.UI.perminfo.display(`Un instant s.v.p.`, `Initialisation du système.`);
  setTimeout(loadingEnd, RoomConfig.config.room.loadingDelay);


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
    Title: `Fermer le système`,
    Text: `Le système sera éteint et tous les paramètres seront réinitialisés.<br>Voulez-vous continuer ?`,
    Options: [
      {
        id: 'endSessionContinue',
        label: 'Oui, fermer le système',
        callback: function () {
          xapi.Command.Presentation.Stop();
          xapi.Command.Call.Disconnect();
          xapi.Command.UserInterface.Message.Prompt.Display(
            {
              Duration: 6,
              FeedbackId: 'standbymessage',
              Text: 'Aurevoir, à la prochaine!',
              Title: `Le système s'éteint`
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
  else {
    setTimeout(ready, RoomConfig.config.room.controlSystemPollingInterval);
    setTimeout(function () {
      scenarios.ready();
      xapi.Command.Standby.Activate();
      Rkhelper.UI.clearPrompt(loadingPrompt);
    }, RoomConfig.config.room.controlSystemPollingInterval);

  }

  let l = Rkhelper.UI.perminfo.display(`Encore quelques secondes...`, `C'est presque prêt!`);
  setTimeout(function () {
    Rkhelper.UI.clearPrompt(l);
  }, RoomConfig.config.room.loadingDelay);

  
}


async function checkControlSystem() {
  var found = false;
  await xapi.Status.Peripherals.ConnectedDevice.get().then(p => {
    p.forEach(peripheral => {
      if (peripheral.SerialNumber == RoomConfig.config.room.controlSystemSerial && peripheral.Status == 'Connected') {
        found = true
      }
    });
  });
  if (found != csConnected) {
    if (found) {
      csConnected = true;
      Rkhelper.UI.clearPrompt(loadingPrompt);
      ready();
      controller.ready();
      scenarios.ready();


    }
    else {
      csConnected = false;
      loadingPrompt = Rkhelper.UI.perminfo.display(`Système non prêt`, `Si le problème persiste après 2 minutes:<br>${RoomConfig.config.room.supportContact}`);
      notready();
      controller.notReady();
      scenarios.notReady();
    }
  }
  if (!found && !csConnected) {
    csConnected = false;
    loadingPrompt = Rkhelper.UI.perminfo.display(`Système non prêt`, `Si le problème persiste après 2 minutes:<br>${RoomConfig.config.room.supportContact}`);
    notready();
    controller.notReady();
    scenarios.notReady();
  }
}


function configureRkhelper() {
  Rkhelper.System.DND.setDndConfig(RoomConfig.config.dnd);
}


function ui_InitDone() {
  if (DEBUG)
    console.log('UI init is done.');
}


async function init() {
  controller = new Controller();
  scenarios = new Scenarios.Scenarios(controller);
  configureRkhelper();
  loadingStart();
}
init();




//Stop sharing on disconnect
xapi.Event.CallDisconnect.on(value => {
  setTimeout(function () {
    xapi.Command.Presentation.Stop();
  }, 6000);
});


xapi.Status.Standby.State.on(value => {
  if (value == 'Off') {
    xapi.Command.UserInterface.Message.Prompt.Display(
      {
        Duration: 5,
        FeedbackId: 'wakemessage',
        Text: 'Patientez quelques secondes, préparation du système...',
        Title: `Bonjour!`
      });
      
    createUi();
  }
});