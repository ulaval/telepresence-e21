/************************************************************

Système: Salles comodales 2021
Script: Rkhelper
Version: 2
Description: Librairie qui bonifie et simplifie certaines 
             fonctionnalités des systèmes de téléprésence Cisco Webex.

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


Plusieurs composantes sont disponibles, entre autre:
- System -> Contrôle des fonctions systèmes comme le "Do Not Disturb"
- Status -> Statut du système, incluant la provenance de la présentation et l'état d'appel
- Audio -> Contrôle des entrées, sorties, routage
- UI -> Contrôles visuels, prompts, boutons, toggles, etc..
- IMC -> Communication inter-macro


*/

/* CHANGELOG
VERSION 2
      - Remplacé certaines commandes réservées à ES6 par des commandes ES5 car mismatch de version de transpiler entre la page web et le codec (bug rapporté chez CISCO)
      
VERSION 1
      - Version initiale


*************************************************************/

import xapi from 'xapi';

const DEBUG = false;


export const PRES_NOPRES = 'PRES_NOPRESENTATION';
export const PRES_LOCALPREVIEW = 'PRES_LOCALPREVIEW';
export const PRES_LOCALSHARE = 'PRES_LOCALSHARE';
export const PRES_REMOTE = 'PRES_REMOTE';
export const PRES_REMOTELOCALPREVIEW = 'PRES_REMOTELOCALPREVIEW';

export const CALLSTATUS_DIALING = 'Dialling';
export const CALLSTATUS_NOCALL = undefined;
export const CALLSTATUS_CONNECTED = 'Connected';
export const CALLSTATUS_CONNECTING = 'Connecting';

export const PRESLOCATION_LOCAL = 'local';
export const PRESLOCATION_REMOTE = 'remote';
export const PRESLOCATION_NONE = 'none';

const TGL_AUTODISPLAYMODE = 'tgl_autodisplaymode';
const TGL_AUTOLIGHTSMODE = 'tgl_autolightsmode';

var dndtimer, dndSuspended = false, dndEnableInterval;
var dndConfig;
var cb_statusChange = [];
var lastCallStatus = { Status: CALLSTATUS_NOCALL };
var prompts = [];
var handlers = [];
var funcs = [];
var callbacks = [];
var widgetActionEventListeners = [];
var activityChangeListeners = [];
var messageListeners = [];
var currentActivity = 'normal';
var presLocation = PRESLOCATION_LOCAL;
var privateModeEnabled = false;

var listeningToPrompts = undefined;

var statusChangeCallbacks = [];

var lastStatus = '';

var showDndMessages = false;





export var dndConfig;

export var Audio = {

  getLocalOutputId(name) {
    return new Promise((success, failure) => {
      var found = false;
      xapi.Status.Audio.Output.LocalOutput.get().then(lo => {
        lo.forEach(o => {
          if (o.Name == name) {
            found = true;
            success(o.id);
          }
        });
        if (!found) failure('LocalOutput not found');
      });
    });
  },

  getLocalInputId(name) {
    return new Promise((success, failure) => {
      var found = false;
      xapi.Status.Audio.Input.LocalInput.get().then(li => {
        li.forEach(i => {
          if (i.Name == name) {
            found = true;
            success(i.id);
          }
        });
        if (!found) failure('LocalInput not found');
      });
    });
  },

  getRemoteInputsIds() {
    return new Promise((success, failure) => {
      xapi.Status.Audio.Input.RemoteInput.get().then(ri => {
        var inputs = [];
        ri.forEach(i => {
          inputs.push(i.id);
        });
        success(inputs);
      });
    });
  }
};





export var System = {
  Camera: {
    getPresetId(name) {
      return new Promise((success, failure) => {
        xapi.Command.Camera.Preset.List().then(presets => {
          presets.Preset.forEach(p => {
            if (p.Name == name) {
              success(p);
            }
          });
          failure();
        });
      });
    }
  },
  DND: {
    enable() {
      clearTimeout(dndtimer);
      xapi.Command.Conference.DoNotDisturb.Activate();
      dndEnableInterval = setInterval(function () { xapi.Command.Conference.DoNotDisturb.Activate(); }, 300000);
    },
    disable(settings) {
      dndEnableInterval = clearInterval(dndEnableInterval);
      if (DEBUG)
        console.log('Activate interval suspended');
      xapi.Command.Conference.DoNotDisturb.Deactivate();
      dndtimer = setTimeout(function () {
        System.DND.enable();
      }, (dndConfig.offTime * 60) * 1000)
    },
    setDndConfig(config) {

      dndConfig = config;
      xapi.Status.Conference.DoNotDisturb.on(dnd => {
        if (dnd == 'Inactive') {
          if (privateModeEnabled) {
            UI.prompt.display({
              title: 'Ne pas déranger - Mode privé',
              text: `Vous ne pouvez pas désactiver le mode "Ne pas déranger" car le mode privé est activé.<p>Désactivez le mode privé et essayez de nouveau.`,
              'Option.1': 'OK'
            });
            xapi.Command.Conference.DoNotDisturb.Activate();
          }
          else {
            if (dndConfig.strict && showDndMessages) {
              UI.prompt.display({
                title: 'Ne pas déranger désactivé',
                text: `Durant les ${dndConfig.offTime} prochaines minutes, vous pouvez recevoir un appel.<p>Ensuite, le mode sera automatiquement réactivé.`,
                'Option.1': 'OK'
              });
              System.DND.disable();
            }
          }
        }
      });
      if (dndConfig.strict) {
        System.DND.enable();
        setTimeout(function () {
          xapi.Command.Conference.DoNotDisturb.Activate();
          xapi.Command.UserInterface.Message.Prompt.Clear();
          showDndMessages = true;
        }, 30000);
      }
    }
  },
  messages: {
    addMessageListener(listener) {
      messageListeners.push(listener);
    },
    send(message) {
      xapi.Command.Message.Send({
        Text: message
      });
    }
  }

};

export var IMC = {
  addMessageHandler(regex, callback) {
    var temphandler = {};
    temphandler.regex = regex;
    temphandler.callback = callback;
    handlers.push(temphandler);
    return temphandler;
  },
  async sendMessage(message) {
    xapi.Status.UserInterface.ContactInfo.Name.get().then(name => {
      xapi.Command.Message.Send({
        Text: name + message
      });
    });
  },

  registerFunction(f) {
    if (DEBUG)
      console.log(`IMC: Registered function ${f.name}`);
    if (f.name != '') {
      funcs.push(f);
    }
  },

  executeFunction(functionName, functionArgs) {
    var r;
    funcs.forEach(f => {
      if (f.name == functionName) {
        r = f(functionArgs);
      }
    });
    return (r);
  },

  callFunction(functionName, functionArgs) {
    if (DEBUG)
      console.log(`IMC: Calling function ${functionName}`);
    var fcall = {
      f: functionName,
      a: functionArgs
    };
    var fcalljson = JSON.stringify(fcall);
    IMC.sendMessage('%FC%' + fcalljson);
  },

  callFunctionReturn(functionName, functionArgs, callback) {
    if (DEBUG)
      console.log(`IMC: Calling function with return ${functionName}`);
    var fcall = {
      f: functionName,
      a: functionArgs,
      i: Math.floor(Math.random() * 100000),
      c: callback
    };
    callbacks.push(fcall);
    var fcalljson = JSON.stringify(fcall);
    IMC.sendMessage('%FCR%' + fcalljson);
  },

  getFunctionCall(f) {
    return function () { IMC.callFunction(f) };
  }
};




export var Status = {
  async getPresentationStatus() {
    var status = {};
    return new Promise((success) => {
      xapi.status.get('conference presentation').then(pres => {
        //console.log(pres);
        if (pres.Mode == 'Receiving') {
          status.remotePresentation = true;
        }
        else {
          status.remotePresentation = false;
        }
        if (pres.LocalInstance !== undefined) {
          status.localPresentation = true;
          status.localPresentationMode = pres.LocalInstance[0].SendingMode;
          status.source = pres.LocalInstance[0].Source;
          status.id = pres.LocalInstance[0].id;
          if (status.remotePresentation == true) {
            if (status.localPresentationMode === 'LocalOnly') {
              status.presentationType = PRES_REMOTELOCALPREVIEW;
            }
            else {
              status.presentationType = PRES_REMOTE;
            }
          }
          else {
            if (status.localPresentationMode === 'LocalOnly') {
              status.presentationType = PRES_LOCALPREVIEW;
            }
            else {
              status.presentationType = PRES_LOCALSHARE;
            }
          }
          success(status);
        }
        else {
          status.localPresentation = false;
          if (status.remotePresentation == true) {
            status.presentationType = PRES_REMOTE;
          }
          else {
            status.presentationType = PRES_NOPRES;
          }
          success(status);
        }
      });
    });
  },
  getCallStatus() {
    return new Promise((success) => {
      xapi.Status.Call.get().then(call => {
        var callStatus = {};

        if (call == '') {
          callStatus.Status = CALLSTATUS_NOCALL;
          lastCallStatus = { Status: CALLSTATUS_NOCALL };
          success(callStatus);
        }
        else if (call[0].Status == 'Connected') {
          callStatus.Status = CALLSTATUS_CONNECTED;
          callStatus.displayName = call[0].DisplayName;
          lastCallStatus = { Status: CALLSTATUS_CONNECTED };
          success(callStatus);

        }
        else if (call[0].Status == 'Connecting') {
          callStatus.Status = CALLSTATUS_CONNECTING;
          callStatus.displayName = call[0].DisplayName;
          lastCallStatus = call[0];
          success(callStatus);
        }
        else if (call[0].Status == 'Idle') {
          callStatus.Status == CALLSTATUS_NOCALL;
          lastCallStatus = call[0];
          success(callStatus);
        }
      });
    });
  },
  getSystemStatus() {
    var systemStatus = {};

    return new Promise(success => {
      Status.getPresentationStatus().then(ps => {
        systemStatus.presentationStatus = ps;

        Status.getCallStatus().then(cs => {
          systemStatus.callStatus = cs;
          systemStatus.activity = currentActivity;
          systemStatus.presLocation = presLocation;
          success(systemStatus);
        });
      });
    });
  },
  addStatusChangeCallback(callback) {
    statusChangeCallbacks.push(callback);
    Status.getSystemStatus().then(status => {
      callback(status);
    });
  },
  addActivityChangeCallback(callback) {
    activityChangeListeners.push(callback);
  },
  notifyChange() {
    Status.getSystemStatus().then(ss => {
      statusChangeCallbacks.forEach(cb_statusChange => {
        if (cb_statusChange != undefined) {
          cb_statusChange(ss);
        }
      });
    });

    /*
    statusChangeCallbacks.forEach(cb_statusChange => {
      if (cb_statusChange != undefined) {
        Status.getSystemStatus().then(ss => {
          cb_statusChange(ss);
        });
      }
    });
    */
  },
  async getStandbyStatus() {
    return new Promise(success => {
      xapi.Status.Standby.get().then(standby => {
        success(standby);
      });
    });
  }
};



export var UI = {
  widgets: {
    addActionListener: function (listener) {
      widgetActionEventListeners.push(listener);
    }
  },
  prompt: {
    display: function (promptOptions, cancelcallback) {
      registerPromptsListeners();
      var i = 0;
      const uniqueId = getUniqueId()
      promptOptions.FeedbackId = uniqueId;
      promptOptions.cancelcallback = cancelcallback;
      if (promptOptions.Options != undefined) {
        promptOptions.Options.forEach(o => {
          promptOptions[`Option.${++i}`] = o.label;
          o.id = i;
        });
      }
      prompts.push(promptOptions);
      var dispargs = {};
      dispargs = Object.assign(dispargs, promptOptions);
      delete dispargs.Options;
      delete dispargs.cancelcallback;
      xapi.command('UserInterface Message Prompt Display', dispargs)
    }
  },
  textPrompt: {
    display: function (promptOptions, callback, cancelcallback) {
      registerPromptsListeners();
      var i = 0;
      const uniqueId = getUniqueId();
      promptOptions.FeedbackId = uniqueId;
      promptOptions.callback = callback;
      promptOptions.cancelcallback = cancelcallback;
      prompts.push(promptOptions);
      var dispargs = {};
      dispargs = Object.assign(dispargs, promptOptions);
      delete dispargs.Options;
      delete dispargs.callback;
      delete dispargs.cancelcallback;
      xapi.command('UserInterface Message TextInput Display', dispargs);
    }
  },
  alert: {
    display: function (title, text, callback) {
      registerPromptsListeners();
      UI.prompt.display({
        Duration: 0,
        FeedbackId: getUniqueId(),
        Title: title,
        Text: text,
        Options: [
          {
            label: `OK`,
            callback: function () { if (callback != undefined) { callback(); } }
          }
        ]
      }, cb => {
        if (callback != undefined)
          callback();
      }, ccb => {
        if (callback != undefined)
          callback();
      });
    }
  },
  perminfo: {
    display: function (title, text) {
      registerPromptsListeners();
      var promptOptions = {};
      const uniqueId = getUniqueId();
      promptOptions.FeedbackId = uniqueId;
      UI.prompt.display({
        Duration: 0,
        FeedbackId: uniqueId,
        Title: title,
        Text: text,
        Options: [

        ]
      }, cb => {
        UI.perminfo.display(title, text);
      }, ccb => {
        UI.perminfo.display(title, text);
      });
      return promptOptions;
    }
  },
  clearPrompt: function (prompt) {
    xapi.Command.UserInterface.Message.Prompt.Clear({
      FeedbackId: prompt.FeedbackId
    });
  },
  removePrompt: function (prompt) {
    for (var i = 0; i < prompts.length; i++) {
      if (prompts[i].FeedbackId === prompt.FeedbackId) {
        prompts.splice(i, 1);
      }
    }
  },
  Interlock: class {
    constructor(toggles) {
      this.toggles = toggles;

    }
  },
  Button: class {
    constructor(widgetId) {
      this.wid = widgetId;
    };
    onClick(listener) {
      UI.widgets.addActionListener(action => {
        if (action.Action != undefined) {
          if (action.Action.Type == 'clicked' && action.Action.WidgetId == this.wid) {
            listener(action.Action);
          }
        }
      });
    };
  },

  Toggle: class {
    constructor(widgetid, defaultValue) {
      this._listener = undefined;
      this._wid = widgetid;
      if (defaultValue != undefined) {
        this.state = defaultValue;
      }

    }
    onChange(listener) {

      this._listener = listener;
      UI.widgets.addActionListener(action => {
        if (action.Action != undefined) {
          if (action.Action.Type == 'changed' && action.Action.WidgetId == this._wid)
            listener(action.Action.Value);
        }
      });
    }
    set state(value) {
      this._value = value;
      xapi.Command.UserInterface.Extensions.Widget.SetValue({
        WidgetId: this._wid,
        Value: this._value
      });
    }
    get state() {
      return this._value;
    }
  },

  UpDown: class {
    constructor(widgetId, value) {
      this._wid = widgetId;
      this.value = value;
    }
    onChange(listener) {

      UI.widgets.addActionListener(action => {
        if (action.Action != undefined) {
          if (action.Action.WidgetId == this._wid && action.Action.Type == 'clicked') {
            listener(action.Action.Value);
          }
        }

      });

    }
    set value(value) {
      this._value = value;
      xapi.Command.UserInterface.Extensions.Widget.SetValue({
        WidgetId: this._wid,
        Value: this._value
      }).catch(err => {
        if (DEBUG)
          console.log(err);
      });

    }
    get value() {
      return this._value;
    }
  }
};

export async function getSystemName() {
  return await xapi.Status.UserInterface.ContactInfo.Name.get();
}




export function getUniqueId() {
  return (Date.now() + Math.floor(Math.random() * 100000));

}

function privatemode_enabled() {
  privateModeEnabled = true;
}
function privatemode_disabled() {
  privateModeEnabled = false;
}

function init() {
  currentActivity = 'normal';

  /* Private mode handlers */
  IMC.registerFunction(privatemode_enabled);
  IMC.registerFunction(privatemode_disabled);



  /* notification triggers */
  xapi.Status.Call.on(call => {
    if (call.Status != undefined) {
      if (lastStatus != call.Status) {
        lastStatus = call.Status;
        Status.notifyChange();
      }
    }
  });
  xapi.Event.CallDisconnect.on(value => {
    lastStatus = CALLSTATUS_NOCALL;
    Status.notifyChange();
  });
  xapi.Event.PresentationPreviewStarted.on(pres => {
    Status.notifyChange();
  });
  xapi.Event.PresentationPreviewStopped.on(pres => {
    Status.notifyChange();
  });
  xapi.Event.PresentationStarted.on(pres => {
    Status.notifyChange();
  });
  xapi.Event.PresentationStopped.on(pres => {
    Status.notifyChange();
  });
  xapi.Status.Standby.State.on(standby => {
    Status.notifyChange();
  });

  xapi.Event.Message.Send.Text.on(msg => {
    xapi.Status.UserInterface.ContactInfo.Name.get().then(name => {
      var regex = new RegExp('^(' + name + ')');
      msg = msg.replace(regex, '');
      if (msg.substring(0, 4) == '%FC%') {
        var functioncall = msg.substring(4);
        var fcall = JSON.parse(functioncall);
        IMC.executeFunction(fcall.f, fcall.a);
      }
      if (msg.substring(0, 5) == '%FCR%') {
        var functioncall = msg.substring(5);
        var fcall = JSON.parse(functioncall);
        fcall.r = executeFunction(fcall.f, fcall.a);
        sendMessage('%FR%' + JSON.stringify(fcall));
      }
      if (msg.substring(0, 4) == '%FR%') {
        var ffound;
        var functionreturn = msg.substring(4);
        var freturn = JSON.parse(functionreturn);
        callbacks.forEach(c => {
          if (c.i == freturn.i) {
            c.c(freturn.r);
            ffound = c;
          }
        });
        const index = callbacks.indexOf(ffound);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
      else {
        handlers.forEach(h => {
          if (h.regex.test(msg)) {
            h.callback(msg);
          }
        });
      }
    });
    messageListeners.forEach(l => {
      l(msg);
    });
  });
}

function registerPromptsListeners() {
  if (listeningToPrompts == undefined) {
    if (DEBUG)
      console.log('Registering Prompt Listeners.');
    listeningToPrompts = true;
    xapi.event.on('UserInterface Message Prompt Response', (response) => {
      prompts.forEach(p => {
        if (p.FeedbackId == response.FeedbackId) {
          if (p.callback != undefined) p.callback(response);
          prompts.splice(prompts.indexOf(p));
          if (p.Options != undefined) {
            p.Options.forEach(o => {
              if (o.id == response.OptionId) {
                o.callback();

              }
            });
          }
          UI.removePrompt(p);
        }
      });
    });

    xapi.event.on('UserInterface Message TextInput Response', (response) => {
      prompts.forEach(p => {
        if (p.FeedbackId == response.FeedbackId) {
          if (p.callback != undefined) p.callback(response);
          UI.removePrompt(p);
        }
      });
    });

    xapi.event.on('UserInterface Message TextInput Clear', (response) => {
      prompts.forEach(p => {
        if (p.FeedbackId == response.FeedbackId) {
          if (p.cancelcallback != undefined) p.cancelcallback();
          UI.removePrompt(p);
        }
      });
    });

    xapi.event.on('UserInterface Message Prompt Cleared', (response) => {
      prompts.forEach(p => {
        if (p.FeedbackId == response.FeedbackId) {
          UI.removePrompt(p);
          if (p.cancelcallback != undefined) p.cancelcallback();
        }
      });
    });

  }
  else {
    if (DEBUG)
      console.log('NOT Registering Prompt Listeners. Already registered.');
  }
}


xapi.Event.UserInterface.Extensions.Widget.on(event => {
  widgetActionEventListeners.forEach(l => {
    l(event);
  });

  if (event.Action != undefined) {
    if (event.Action.WidgetId == 'currentactivity') {
      currentActivity = event.Action.Value;
      Status.notifyChange();
    }
    else if (event.Action.WidgetId == 'preslocation' && event.Action.Type == 'pressed') {
      presLocation = event.Action.Value;
      Status.notifyChange();
    }
    else if (event.Action.WidgetId == TGL_AUTODISPLAYMODE || event.Action.WidgetId == TGL_AUTOLIGHTSMODE) {
      Status.notifyChange();
    }
  }
});



init();
