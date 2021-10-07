/************************************************************

Système: Salles comodales 2021
Script: JoindreZoom
Version: 1.1
Description: Ajoute les fonctionnalités d'appel et de contrôle
             de Zoom CRC

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

CHANGELOG

VERSION 1.1
      - Correction d'un bug DTMF lors d'un meeting joint par OBTP

VERSION 1.0
      - Version initiale

BETA 5.1
      - Correction d'un bug de vérification de OBTP

BETA 5
      - Correction d'un bug de vérification des adresses SIP
      - Correction d'un bug avec l'activation du mode USB
      - Nouvelle interface de contrôle Zoom
      - Ajout d'un message lors du démarrage / arrêt de l'enregistrement
      - Refonte de l'interface de contrôle de la rencontre
      - Ajout du support pour OBTP (au choix)
      - Ajout du mode "standalone" pour les salles qui ne sont pas dans le projet "SSE-COMODALE-E2021"

BETA 4 
      - Ajout du support pour "USBMODE"
      - Ajout dyu support pour "PRIVATEMODE"
      
BETA 3 (2021-07-07)
      - Support pour plusieurs domaines SIP (préconfiguré pour zmca.us et zoomcrc.com)
      - Enlevé la librarie "UIHelper"
      - A besoin de la librairie "Rkhelper" version 1 ou suppérieure (rkhelper.js)

BETA 2 (2021-05-24)
      - Correction d'un bug où le menu zoom est affiché dans un autre type d'appel
      - Ajustement de la séquence de touche pour admettre les gens dans la rencontre
      - Mise à jour du module UIHelper_0 à UIHelper_1
      - Nettoyage du code
      
BETA 1 (2021-03-25)
      - Ajout du concept "Mot de passe de la rencontre" et "Clé de l'animateur"
      - Ajustement des termes utilisés
      - Ajout de la section configuration
      - Ajout de la fonction de nettoyage de l'historique d'appel


*************************************************************/




//CONFIGURATION CI-DESSOUS

/* POUR UTILISATION AVEC SYSTÈME SSE-COMODALE-E2021 */

import xapi from 'xapi';
import * as JoindreZoomUI from './JoindreZoom_UI';
import * as RoomConfig from './RoomConfig';
import * as Rkhelper from './Rkhelper';

const DEBUG = false;

var standalone = false;
var zoomConfig = {
  call: {
    sipDomains: [`zmca.us`, `zoomcrc.com`], //Domaines SIP reconnus. Le premier est celui par défaut pour la composition.,
    askHostKeyWithOBTP: RoomConfig.config.zoom.askHostKeyWithOBTP
  },
  callHistory: {
    autoDelete: RoomConfig.config.zoom.callHistoryAutoDelete,
    autoDeleteMethod: RoomConfig.config.zoom.callHistoryAutoDeleteMethod,
    autoDeleteTimeout: RoomConfig.config.zoom.callHistoryAutoDeleteTimeout
  }
}






/* POUR UTILISATION EN MODE STANDALONE */
/*
import xapi from 'xapi';
import * as JoindreZoomUI from './JoindreZoom_UI';
import * as Rkhelper from './Rkhelper';

var standalone = true;
var zoomConfig = {
  call: {
    sipDomains: [`zmca.us`, `zoomcrc.com`], //Domaines SIP reconnus. Le premier est celui par défaut pour la composition.
    askHostKeyWithOBTP:true //Demande le host key dans une boite de dialogue lorsque l'appel est effectué via le OBTP
  },
  callHistory: {
    autoDelete: true, //Nettoyage de l'historique d'appel: true, false
    autoDeleteMethod: METHOD_ONDISCONNECT, //Méthode de nettoyage: METHOD_ONDISCONNECT , METHOD_ONSTANDBY
    autoDeleteTimeout: 3000 //Temps de grâce avant le nettoyage (ms)
  }
}
*/









/* NE RIEN TOUCHER EN BAS DE CETTE LIGNE */

const CONFTYPE_HOST = 'HOST';
const CONFTYPE_GUEST = 'GUEST';

const METHOD_ONDISCONNECT = `AUTODELETEMETHOD_ONDISCONNECT`;
const METHOD_ONSTANDBY = `AUTODELETEMETHOD_ONSTANDBY`;

var currentCall = {};
var deleteCallHistoryTimeout;
var obtpPattern = /\d*\.\d*@/;
var zoomCallConfig = {
  obtp: true
};


function callZoom() {
  var sipuri = '';
  if (zoomCallConfig.conferenceType == CONFTYPE_HOST) {
    sipuri = `${zoomCallConfig.conferenceNumber}.${zoomCallConfig.conferencePin}..${zoomCallConfig.hostKey}@${zoomConfig.call.sipDomains[0]}`;
  }
  else if (zoomCallConfig.conferenceType == CONFTYPE_GUEST) {
    sipuri = zoomCallConfig.conferenceNumber + '.' + zoomCallConfig.conferencePin + `@${zoomConfig.call.sipDomains[0]}`;
  }


  xapi.Command.Dial({
    Number: `${sipuri}`,
    DisplayName: `Conférence Zoom`
  });
}

function askPin() {
  zoomAskConferencePin(pin => {
    if (!isNaN(pin)) {
      zoomCallConfig.conferencePin = pin;
      if (zoomCallConfig.conferenceType == CONFTYPE_HOST) {
        askHostKey();
      }
      else {
        callZoom();
      }
    }
    else {
      Rkhelper.UI.alert.display('Oups...', 'Le PIN doit être numérique...', () => {
        askPin();
      });
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
    InputType: 'Numeric',
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
    })
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

function zoomAskHostKeyOBTP(callback, cancelcallback) {
  Rkhelper.UI.textPrompt.display({
    Duration: 0,
    FeedbackId: 'fbZoomHostKeyOBTP',
    InputType: 'Numeric',
    SubmitText: 'Confirmer',
    KeyboardState: 'Open',
    Placeholder: `Clé de l'animateur`,
    Title: `Clé de l'animateur`,
    Text: `Entrez la clé de l'animateur.<br>Appuyez sur "Annuler" si vous n'êtes pas l'animateur.`
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






function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function deleteCallHistory() {
  if (zoomConfig.callHistory.autoDelete) {
    xapi.Command.CallHistory.Get().then(calls => {
      calls.Entry.forEach(e => {
        if (isZoom(e.CallbackNumber)) {
          xapi.Command.CallHistory.DeleteEntry({
            CallHistoryId: e.CallHistoryId
          });
        }
      });
    });
  }
}

function dtmfSend(string) {
  xapi.Command.Call.dtmfSend({
    DTMFString: string
  });
}

function isZoom(cbn) {
  var is = false;
  zoomConfig.call.sipDomains.forEach(sd => {
    let t = new RegExp(sd);
    if (t.test(cbn)) {
      is = true;
    }
  });
  return is;
}


xapi.Status.Call.on(call => {
  Object.assign(currentCall, call);
  if (currentCall.Status === 'Connected') {
    if (isZoom(currentCall.CallbackNumber)) {
      if (zoomCallConfig.obtp == true && obtpPattern.test(currentCall.CallbackNumber) && zoomConfig.call.askHostKeyWithOBTP) {
        if (DEBUG)
          console.log(zoomConfig);
        zoomAskHostKeyOBTP(response => {
          if (response != '') {
            dtmfSend(`${response}#`);
          }
        },
          cancel => {

          });
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
  if (zoomConfig.callHistory.autoDeleteMethod === METHOD_ONDISCONNECT) {
    deleteCallHistoryTimeout = setTimeout(deleteCallHistory, zoomConfig.callHistory.autoDeleteTimeout);
  }
});


xapi.Status.Standby.on(status => {
  if (status.State === `Standby` && zoomConfig.callHistory.autoDeleteMethod === METHOD_ONSTANDBY) {
    deleteCallHistoryTimeout = setTimeout(deleteCallHistory, zoomConfig.callHistory.autoDeleteTimeout);
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

function init() {
  hideZoomInCallMenu();
  Rkhelper.IMC.registerFunction(privatemode_enabled);
  Rkhelper.IMC.registerFunction(privatemode_disabled);
  Rkhelper.IMC.registerFunction(usbmode_enabled);
  Rkhelper.IMC.registerFunction(usbmode_disabled);

}



JoindreZoomUI.createUi();
init();






















