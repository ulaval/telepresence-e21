/************************************************************

Système: Salles comodales 2021
Script: RoomController
Version: 1.1
Description: Charge les différentes composantes du système
             et gère le comportement général de la salle

Auteur: Zacharie Gignac
Date: Août 2021
Organisation: Université Laval


MIT License

Copyright (c) 2021 ul-sse

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*************************************************************/


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

var statusChanged;

var controller;
var lights;



export class Controller {
  constructor() {
    const that = this;
    this.disp_tv = undefined;
    this.disp_proj = undefined;
    this.disp_screen = undefined;
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
              this.disp_tv.off();
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
        this.autoDisplay = true;
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
          duration: 15
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


function loadingEnd() {


  Settings.init(controller);

  //Register external functions 
  enablePrivateMode = Rkhelper.IMC.getFunctionCall('privatemode_enable');
  disablePrivateMode = Rkhelper.IMC.getFunctionCall('privatemode_disable');
  enableUsbMode = Rkhelper.IMC.getFunctionCall('usbmode_enable');
  disableUsbMode = Rkhelper.IMC.getFunctionCall('usbmode_disable');

  //Register callbacks 
  Rkhelper.IMC.registerFunction(ui_InitDone);
  Rkhelper.IMC.registerFunction(privatemode_enabled);
  Rkhelper.IMC.registerFunction(privatemode_disabled);

  //Ajoute le bouton "Terminer la session"
  xapi.command('UserInterface Extensions Panel Save', {
    PanelId: 'endSession'

  }, `
  <Extensions>
  <Version>1.8</Version>
  <Panel>
    <Order>20</Order>
    <PanelId>endSession</PanelId>
    <Type>Home</Type>
    <Icon>Power</Icon>
    <Color>#FF0000</Color>
    <Name>Fermer le système</Name>
    <ActivityType>Custom</ActivityType>
  </Panel>
</Extensions>
`);

  xapi.Event.UserInterface.Extensions.Panel.Clicked.on(panel => {
    if (panel.PanelId == 'endSession') {
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
              xapi.Command.Standby.Activate();
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



