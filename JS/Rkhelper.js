/*jshint esversion: 6 */
const xapi = require('xapi');

const DEBUG = false;


const PRES_NOPRES = 'PRES_NOPRESENTATION';
const PRES_LOCALPREVIEW = 'PRES_LOCALPREVIEW';
const PRES_LOCALSHARE = 'PRES_LOCALSHARE';
const PRES_REMOTE = 'PRES_REMOTE';
const PRES_REMOTELOCALPREVIEW = 'PRES_REMOTELOCALPREVIEW';
const CALLSTATUS_DIALING = 'Dialling';
const CALLSTATUS_NOCALL = undefined;
const CALLSTATUS_CONNECTED = 'Connected';
const CALLSTATUS_CONNECTING = 'Connecting';
const PRESLOCATION_LOCAL = 'local';
const PRESLOCATION_REMOTE = 'remote';
const PRESLOCATION_NONE = 'none';

module.exports.PRES_NOPRES = PRES_NOPRES;
module.exports.PRES_LOCALPREVIEW = PRES_LOCALPREVIEW;
module.exports.PRES_LOCALSHARE = PRES_LOCALSHARE;
module.exports.PRES_REMOTE = PRES_REMOTE;
module.exports.PRES_REMOTELOCALPREVIEW = PRES_REMOTELOCALPREVIEW;
module.exports.CALLSTATUS_DIALING = CALLSTATUS_DIALING;
module.exports.CALLSTATUS_NOCALL = CALLSTATUS_NOCALL;
module.exports.CALLSTATUS_CONNECTED = CALLSTATUS_CONNECTED;
module.exports.CALLSTATUS_CONNECTING = CALLSTATUS_CONNECTING;
module.exports.PRESLOCATION_LOCAL = PRESLOCATION_LOCAL;
module.exports.PRESLOCATION_REMOTE = PRESLOCATION_REMOTE;
module.exports.PRESLOCATION_NONE = PRESLOCATION_NONE;


const TGL_AUTODISPLAYMODE = 'tgl_autodisplaymode';
const TGL_AUTOLIGHTSMODE = 'tgl_autolightsmode';

var dndtimer, dndEnableInterval;
var dndConfig;
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

var listeningToPrompts;

var statusChangeCallbacks = [];

var lastStatus = '';

var showDndMessages = false;





var dndConfig;
module.exports.dndConfig = dndConfig;

const Audio = {

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

module.exports.Audio = Audio;



const System = {
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
        }).catch(() => failure());
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
      }, (dndConfig.offTime * 60) * 1000);
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
module.exports.System = System;

const IMC = {
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
    return function () { IMC.callFunction(f); };
  }
};
module.exports.IMC = IMC;



const Status = {
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
          callStatus.Status = CALLSTATUS_NOCALL;
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
  notifyChange(src) {
    //console.log('notify: ' +src);
    Status.getSystemStatus().then(ss => {
      statusChangeCallbacks.forEach(cbsc => {
        if (cbsc != undefined) {
          cbsc(ss);
        }
      });
    });

  },
  async getStandbyStatus() {
    return new Promise(success => {
      xapi.Status.Standby.get().then(standby => {
        success(standby);
      });
    });
  }
};
module.exports.Status = Status;



const UI = {
  widgets: {
    addActionListener: function (listener) {
      widgetActionEventListeners.push(listener);
    }
  },
  prompt: {
    display: function (promptOptions, cancelcallback) {
      registerPromptsListeners();
      var i = 0;
      const uniqueId = getUniqueId();
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
      xapi.command('UserInterface Message Prompt Display', dispargs);
    }
  },
  textPrompt: {
    display: function (promptOptions, callback, cancelcallback) {
      registerPromptsListeners();
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
    }
    onClick(listener) {
      UI.widgets.addActionListener(action => {
        if (action.Action != undefined) {
          if (action.Action.Type == 'clicked' && action.Action.WidgetId == this.wid) {
            listener(action.Action);
          }
        }
      });
    }
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
module.exports.UI = UI;


export async function getSystemName() {
  return await xapi.Status.UserInterface.ContactInfo.Name.get();
}
module.exports.getSystemName = getSystemName;




export function getUniqueId() {
  return (Date.now() + Math.floor(Math.random() * 100000));
}
module.exports.getUniqueId = getUniqueId;

function privatemode_enabled() {
  privateModeEnabled = true;
}
function privatemode_disabled() {
  privateModeEnabled = false;
}
function forceNotifyStatusChange() {
  Status.notifyChange('forceNotifyStatusChange');
}

function changePresenterLocationRemote() {
  presLocation = 'remote';
  Status.notifyChange('changePresenterLocationRemote');
}
function changePresenterLocationLocal() {
  presLocation = 'local';
  Status.notifyChange('changePresenterLocationLocal');
}

function init() {
  currentActivity = 'normal';

  /* Private mode handlers */
  IMC.registerFunction(privatemode_enabled);
  IMC.registerFunction(privatemode_disabled);
  IMC.registerFunction(forceNotifyStatusChange);
  IMC.registerFunction(changePresenterLocationLocal);
  IMC.registerFunction(changePresenterLocationRemote);


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
      else if (msg.substring(0, 5) == '%FCR%') {
        var funccall = msg.substring(5);
        var fcall = JSON.parse(funccall);
        fcall.r = IMC.executeFunction(fcall.f, fcall.a);
        IMC.sendMessage('%FR%' + JSON.stringify(fcall));
      }
      else if (msg.substring(0, 4) == '%FR%') {
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

/* Init with delay 8s */
setTimeout(() => {
  init();
},8000);

