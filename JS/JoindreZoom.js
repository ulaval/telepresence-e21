/*jshint esversion: 6 */
//VERSION:6.0

const xapi = require('xapi');
const JoindreZoomUI = require('./JoindreZoom_UI');
const RoomConfig = require('./RoomConfig');
const Rkhelper = require('./Rkhelper');


const OPT_FORCE_OUT_OF_BAND_DTMF = 200001;
const OPT_SUPPRESS_AUDIO_PROMPTS = 200006;
const OPT_ENABLE_1080P = 309;
const OPT_SUPPRESS_VISUAL_MENU = 504;

const advancedOptions = [
  OPT_FORCE_OUT_OF_BAND_DTMF,
  OPT_ENABLE_1080P,
  OPT_SUPPRESS_AUDIO_PROMPTS,
  OPT_SUPPRESS_VISUAL_MENU
];


//CONFIGURATION CI-DESSOUS
/* POUR UTILISATION AVEC SYSTÈME SSE-COMODALE-E2021 */


const DEBUG = false;


var zoomConfig = {
  call: {
    sipDomains: [`zmca.us`, `zoomcrc.com`], //Domaines SIP reconnus. Le premier est celui par défaut pour la composition.,
  },
  callHistory: {
    autoDelete: RoomConfig.config.zoom.callHistoryAutoDelete,
    autoDeleteMethod: RoomConfig.config.zoom.callHistoryAutoDeleteMethod,
    autoDeleteTimeout: RoomConfig.config.zoom.callHistoryAutoDeleteTimeout
  },
  ui: {
    iconOrder: RoomConfig.config.ui.iconOrder.zoom
  }
};

/* NE RIEN TOUCHER EN BAS DE CETTE LIGNE */

const CONFTYPE_HOST = 'HOST';
const CONFTYPE_GUEST = 'GUEST';

const METHOD_ONDISCONNECT = `AUTODELETEMETHOD_ONDISCONNECT`;
const METHOD_ONSTANDBY = `AUTODELETEMETHOD_ONSTANDBY`;

var currentCall = {};
var deleteCallHistoryTimeout;
var hostkeyShown = false;
var obtpPattern = /\d*\.\d*@/;
var zoomCallConfig = {
  obtp: true
};


function getOptions() {
  return advancedOptions.join('');
}

function callZoom() {
  var sipuri = '';
  if (zoomCallConfig.conferenceType == CONFTYPE_HOST) {
    sipuri = `${zoomCallConfig.conferenceNumber}.${zoomCallConfig.conferencePin}.${getOptions()}.${zoomCallConfig.hostKey}@${zoomConfig.call.sipDomains[0]}`;
  }
  else if (zoomCallConfig.conferenceType == CONFTYPE_GUEST) {
    sipuri = zoomCallConfig.conferenceNumber + '.' + zoomCallConfig.conferencePin + `.${getOptions()}@${zoomConfig.call.sipDomains[0]}`;
  }


  xapi.Command.Dial({
    Number: `${sipuri}`,
    DisplayName: `Conférence Zoom`
  });
}

function askPin() {
  zoomAskConferencePin(pin => {
      zoomCallConfig.conferencePin = pin;
      if (zoomCallConfig.conferenceType == CONFTYPE_HOST) {
        askHostKey();
      }
      else {
        callZoom();
      }
  }, (cancel) => { });
}
function askConfNumber() {
  zoomAskConferenceNumber(confnumber => {
    if (!isNaN(confnumber) && confnumber != '') {
      zoomCallConfig.conferenceNumber = confnumber;
      askPin();
    }
    else {
      Rkhelper.UI.alert.display('Oups...', 'Le numéro de conférence doit être numérique...', () => {
        askConfNumber();
      });
    }
  }, (cancel) => { });
}
function askHostKey() {
  zoomAskHostKey(hostkey => {
    if (!isNaN(hostkey)) {
      zoomCallConfig.hostKey = hostkey;
      zoomCallConfig.obtp = false;
      callZoom();
    }
    else {
      Rkhelper.UI.alert.display('Oups...', `La clé de l'organisateur doit être numérique...`, () => {
        askHostKey();
      });
    }
  },
    cancel => { });
}

xapi.Event.UserInterface.Extensions.Panel.Clicked.on(panel => {
  if (panel.PanelId === 'joinzoom') {
    zoomAskConferenceType(conftype => {
      zoomCallConfig.conferenceType = conftype;
      askConfNumber();
    },
      (cancel) => { }
    );
  }
});



function zoomAskConferenceType(callback, cancelcallback) {
  Rkhelper.UI.prompt.display({
    Duration: 0,
    FeedbackId: 'fbZoomConfType',
    Title: `Êtes-vous animateur ou un participant ?`,
    Text: ``,
    Options: [
      {
        label: `Je suis l'animateur`,
        callback: function () { callback(CONFTYPE_HOST); }
      },
      {
        label: 'Je suis un participant',
        callback: function () { callback(CONFTYPE_GUEST); }
      }
    ]
  },
    cancel => {
      cancelcallback();
    });
}

function zoomAskConferenceNumber(callback, cancelcallback) {
  Rkhelper.UI.textPrompt.display({
    Duration: 0,
    FeedbackId: 'fbZoomConfNumber',
    InputType: 'Numeric',
    SubmitText: 'Suivant',
    KeyboardState: 'Open',
    Placeholder: 'ID de la réunion',
    Title: 'ID de la réunion',
    Text: 'Entrez le ID de la réunion'
  },
    response => {
      callback(response.Text);
    },
    cancel => {
      cancelcallback();
    });
}

function zoomAskConferencePin(callback, cancelcallback) {

  Rkhelper.UI.textPrompt.display({
    Duration: 0,
    FeedbackId: 'fbZoomPINNumber',
    InputType: 'SingleLine',
    SubmitText: 'Suivant',
    KeyboardState: 'Open',
    Placeholder: `Code secret, ou vide`,
    Title: `Code secret`,
    Text: `Entrez le code secret de la rencontre. Laissez vide si cette rencontre n'a pas de code secret.`
  },
    response => {
      callback(response.Text);
    },
    cancel => {
      cancelcallback();
    });
}

function zoomAskHostKey(callback, cancelcallback) {
  Rkhelper.UI.textPrompt.display({
    Duration: 0,
    FeedbackId: 'fbZoomHostKey',
    InputType: 'Numeric',
    SubmitText: 'Suivant',
    KeyboardState: 'Open',
    Placeholder: `Clé de l'animateur`,
    Title: `Clé de l'animateur`,
    Text: `Entrez la clé de l'animateur`
  },
    response => {
      callback(response.Text);
    },
    cancel => {
      cancelcallback();
    }
  );
}


var btnLayout = new Rkhelper.UI.Button('zoomChangeLayout');
btnLayout.onClick(() => {
  dtmfSend('#11');
});




var btnRecord = new Rkhelper.UI.Button('zoomRecord');
btnRecord.onClick(() => {
  dtmfSend('#15');
  Rkhelper.UI.prompt.display({
    Duration: 8,
    Title: `Enregistrement`,
    Text: `L'état de l'enregistrement est affiché en haut à gauche sur le moniteur de téléprésence.`,
    Options: [
      {
        id: 'zoomrecok',
        label: 'OK',
        callback: function () { xapi.Command.UserInterface.Extensions.Panel.Close(); }
      }
    ]
  },
    cancel => {
      xapi.Command.UserInterface.Extensions.Panel.Close();
    });
});

var btnMuteAll = new Rkhelper.UI.Button('zoomMuteAll');
btnMuteAll.onClick(() => {
  dtmfSend('#176');
  xapi.Command.UserInterface.Extensions.Panel.Close();
});

var btnAdmitAll = new Rkhelper.UI.Button('zoomAdmitAll');
btnAdmitAll.onClick(() => {
  dtmfSend('#1610');
  xapi.Command.UserInterface.Extensions.Panel.Close();
});

var btnMenu = new Rkhelper.UI.Button('zoomMenu');
btnMenu.onClick(() => {
  dtmfSend('7');
  xapi.Command.UserInterface.Extensions.Panel.Close();
});






function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function deleteCallHistory() {
  if (zoomConfig.callHistory.autoDelete) {
    xapi.Command.CallHistory.Get().then(calls => {
      for (var e of calls.Entry) {
        if (isZoom(e.CallbackNumber)) {
          xapi.Command.CallHistory.DeleteEntry({
            CallHistoryId: e.CallHistoryId
          });
        }
      };
    }).catch(err => {
      console.warn(err);
    }); 
  }
}

function dtmfSend(string) {
  xapi.Command.Call.dtmfSend({
    DTMFString: `*${string}`
  });
}
function dtmfSendCode(string) {
  xapi.Command.Call.dtmfSend({
    DTMFString: `${string}`
  });
}

function isZoom(cbn) {
  var is = false;
  if (zoomConfig.call.sipDomains) {
    for (var sd of zoomConfig.call.sipDomains) {
      let t = new RegExp(sd);
      if (t.test(cbn)) {
        is = true;
      }
    };
  }
  return is;
}


xapi.Status.Call.on(call => {
  Object.assign(currentCall, call);
  if (currentCall.Status === 'Connected') {
    if (isZoom(currentCall.CallbackNumber)) {
      if (zoomCallConfig.obtp == true && obtpPattern.test(currentCall.CallbackNumber) && !hostkeyShown) {
        if (DEBUG)
          console.log(zoomConfig);
        hostkeyShown = true;
      }
      showZoomInCallMenu();
      clearTimeout(deleteCallHistoryTimeout);
    }
    else {
      hideZoomInCallMenu();
    }
  }
});





xapi.Event.CallDisconnect.on(call => {
  hideZoomInCallMenu();
  zoomCallConfig.obtp = true;
  hostkeyShown = false;
  if (zoomConfig.callHistory.autoDeleteMethod === METHOD_ONDISCONNECT) {
    deleteCallHistoryTimeout = setTimeout(deleteCallHistory, zoomConfig.callHistory.autoDeleteTimeout);
  }
});


xapi.Status.Standby.on(status => {
  if (status.State === `Standby` && zoomConfig.callHistory.autoDeleteMethod === METHOD_ONSTANDBY) {
    deleteCallHistoryTimeout = setTimeout(deleteCallHistory, zoomConfig.callHistory.autoDeleteTimeout);
  }
  else if (status.State == 'Off') {
    JoindreZoomUI.createUi(advancedOptions, zoomConfig.ui.iconOrder);
  }
});

function hideCallZoomButton() {
  xapi.Command.UserInterface.Extensions.Panel.Update({
    PanelId: 'joinzoom',
    Visibility: 'Hidden'
  });
}
function showCallZoomButton() {
  xapi.Command.UserInterface.Extensions.Panel.Update({
    PanelId: 'joinzoom',
    Visibility: 'Auto'
  });
}
function hideZoomInCallMenu() {
  xapi.Command.UserInterface.Extensions.Panel.Update({
    PanelId: 'panelZoom',
    Visibility: 'Hidden'
  });
}
function showZoomInCallMenu() {
  xapi.Command.UserInterface.Extensions.Panel.Update({
    PanelId: 'panelZoom',
    Visibility: 'Auto'
  });
}

function privatemode_enabled() {
  xapi.Command.UserInterface.Extensions.Panel.Update({
    PanelId: 'joinzoom',
    Visibility: 'Hidden'
  });
}
function privatemode_disabled() {
  xapi.Command.UserInterface.Extensions.Panel.Update({
    PanelId: 'joinzoom',
    Visibility: 'Auto'
  });
}
function usbmode_enabled() {
  hideCallZoomButton();
}
function usbmode_disabled() {
  showCallZoomButton();
}
async function getBootTime() {
  const uptime = await xapi.Status.SystemUnit.Uptime.get();
  return uptime;
}
async function init() {
  var bootTime = await getBootTime();
  if (bootTime > 290) {
    if (DEBUG)
      console.log(`JoindreZoom: init()`);
    JoindreZoomUI.createUi(advancedOptions, zoomConfig.ui.iconOrder);
    hideZoomInCallMenu();
    Rkhelper.IMC.registerFunction(privatemode_enabled);
    Rkhelper.IMC.registerFunction(privatemode_disabled);
    Rkhelper.IMC.registerFunction(usbmode_enabled);
    Rkhelper.IMC.registerFunction(usbmode_disabled);
  }
}

/* INIT WITH DELAY 10s */
setTimeout(() => {
  init();

}, 10000);
