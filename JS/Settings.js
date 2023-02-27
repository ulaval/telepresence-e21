/*jshint esversion: 6 */
//VERSION:6.0

const xapi = require('xapi');
const RoomConfig = require('./RoomConfig');
const Rkhelper = require('./Rkhelper');

const DEBUG = false;

const TGL_AUTODISPLAYMODE = 'tgl_autodisplaymode';
const TGL_AUTOLIGHTSMODE = 'tgl_autolightsmode';
const TGL_CEILINGMICS = 'tgl_ceilingmics';


var controller;


var tgl_autoDisplayMode, tgl_autoLightsMode;

var autodisplaymode, autolightsmode;
var showdisplaycontrols = false, showlightcontrols = false;

var currentactivity = 'normal';

var presenterLocation = 'local';
var lastRemotePresentationValue = false;

var ceilingMicsMode = 'on';
var changePresenterLocationLocal;
var changePresenterLocationRemote;

function drawRoomConfigPanel() {
  xapi.Command.UserInterface.Extensions.Panel.Save({
    PanelId: 'roomconfig'
  },
    `
<Extensions>
  <Version>1.8</Version>
  <Panel>
    <Order>${RoomConfig.config.ui.iconOrder.settings}</Order>
    <PanelId>roomconfig</PanelId>
    <Origin>local</Origin>
    <Type>Statusbar</Type>
    <Icon>Sliders</Icon>
    <Color>#c22987</Color>
    <Name>Accéder aux paramètres</Name>
    <ActivityType>Custom</ActivityType>
      <Page>
      <Name>Salle</Name>
          <Row>
        <Name>Emplacement du présentateur</Name>
        <Widget>
          <WidgetId>preslocation</WidgetId>
          <Type>GroupButton</Type>
          <Options>size=4</Options>
          <ValueSpace>
            <Value>
              <Key>local</Key>
              <Name>Sur place</Name>
            </Value>
            <Value>
              <Key>remote</Key>
              <Name>À distance</Name>
            </Value>
          </ValueSpace>
        </Widget>
      </Row>

    ${getActivitiesControls()}
    </Page>
    ${getAudioControls()}
    <Page>
      <Name>Avancé</Name>
      <Row>
        <Name>Affichages automatiques</Name>
        <Widget>
          <WidgetId>tgl_autodisplaymode</WidgetId>
          <Type>ToggleButton</Type>
          <Options>size=1</Options>
        </Widget>
      </Row>
      ${getDisplayControls()}
      ${getLightsControls()}
      <Options/>
    </Page>
    

  </Panel>
</Extensions>
`);
}


function getActivitiesControls() {
  var xml = ``;

  if (RoomConfig.config.room.showActivities) {
    xml = `
      <Row>
        <Name>Activité</Name>
        <Widget>
          <WidgetId>currentactivity</WidgetId>
          <Type>GroupButton</Type>
          <Options>size=4;columns=2</Options>
          <ValueSpace>`;
    for (const activity of RoomConfig.config.room.activities) {
      xml += `
          <Value>
            <Key>${activity.id}</Key>
            <Name>${activity.name}</Name>
           </Value>
      `;
    }

    xml += `
     </ValueSpace>
        </Widget>
      </Row>
    `;
  }
  return xml;
}
function getAudioControls() {
  var xml = `<Page>
      <Name>Microphones</Name>
      <Row>
        <Name>Microphones salle (étudiants)</Name>
        <Widget>
          <WidgetId>tgl_ceilingmics</WidgetId>
          <Type>ToggleButton</Type>
          <Options>size=1</Options>
        </Widget>
      </Row>
      <Row>
        <Name>Niveau des microphones</Name>
      </Row>
      
      
      `;

  for (const input of RoomConfig.config.audio.inputs) {
    xml += `
          <Row>
        <Name>${input.name}</Name>
        <Widget>
          <WidgetId>audioinput_${input.connector}</WidgetId>
          <Type>GroupButton</Type>
          <Options>size=4</Options>
          <ValueSpace>
            <Value>
              <Key>mute</Key>
              <Name>Muet</Name>
            </Value>
            <Value>
              <Key>normal</Key>
              <Name>Normal</Name>
            </Value>
            <Value>
              <Key>loud</Key>
              <Name>Plus fort</Name>
            </Value>
            <Value>
              <Key>louder</Key>
              <Name>Très fort</Name>
            </Value>
          </ValueSpace>
        </Widget>
      </Row>
    `;
  }
  xml += `</Page>`;
  return xml;
}

function getDisplayControls() {
  var xml = '';
  if (showdisplaycontrols) {
    xml = `
    <Row>
        <Name>Alimentation télé</Name>
        <Widget>
          <WidgetId>tvpower</WidgetId>
          <Type>GroupButton</Type>
          <Options>size=4;columns=4</Options>
          <ValueSpace>
            <Value>
              <Key>off</Key>
              <Name>OFF</Name>
            </Value>
            <Value>
              <Key>on</Key>
              <Name>ON</Name>
            </Value>
          </ValueSpace>
        </Widget>
      </Row>
      <Row>
        <Name>Alimentation projecteur</Name>
        <Widget>
          <WidgetId>projpower</WidgetId>
          <Type>GroupButton</Type>
          <Options>size=4</Options>
          <ValueSpace>
            <Value>
              <Key>off</Key>
              <Name>OFF</Name>
            </Value>
            <Value>
              <Key>on</Key>
              <Name>ON</Name>
            </Value>
          </ValueSpace>
        </Widget>
      </Row>
      ${getManualScreenControls()}
      `;
  }
  return xml;

}
function getManualScreenControls() {
  if (RoomConfig.config.room.motorizedScreen) {
    var controls = `
      <Row>
        <Name>Toile de projection</Name>
        <Widget>
          <WidgetId>screen_down</WidgetId>
          <Type>Button</Type>
          <Options>size=1;icon=arrow_down</Options>
        </Widget>
        <Widget>
          <WidgetId>screen_up</WidgetId>
          <Type>Button</Type>
          <Options>size=1;icon=arrow_up</Options>
        </Widget>
      </Row>`;
    return controls;
  }
}
function getLightsControls() {
  var xml = '';
  if (RoomConfig.config.room.lightsControl) {
    xml += `<Row>
        <Name>Éclairage automatique</Name>
        <Widget>
          <WidgetId>tgl_autolightsmode</WidgetId>
          <Type>ToggleButton</Type>
          <Options>size=1</Options>
        </Widget>
      </Row>
    `;
  }
  if (showlightcontrols) {
    xml += getLightsScenes();
    xml += getZonesControls();
  }
  return xml;
}

function getLightsScenes() {
  var xml = `<Row>
        <Name>Scènes</Name>`;
  for (const scene of RoomConfig.config.lights.scenes) {
    if (scene.show) {
      xml += `
        <Widget>
          <WidgetId>${scene.id}</WidgetId>
          <Name>${scene.name}</Name>
          <Type>Button</Type>
          <Options>size=2</Options>
        </Widget>
      `;
    }
  }
  xml += `</Row>`;
  return xml;
}

function getZonesControls() {
  var xml = ``;
  for (const zone of RoomConfig.config.lights.zones) {
    if (zone.show) {
      xml += `<Row>
        <Name>${zone.name}</Name>
        `;

      if (zone.type == 'dim') {
        xml += `<Widget>
          <WidgetId>${zone.id}_dim</WidgetId>
          <Type>Spinner</Type>
          <Options>size=2;style=plusminus</Options>
        </Widget>`;

      }

      xml += `
        <Widget>
          <WidgetId>${zone.id}_onoff</WidgetId>
          <Type>ToggleButton</Type>
          <Options>size=1</Options>
        </Widget>
        `;
      xml += `</Row>`;
    }
  }
  return xml;
}

function setDefaultValues() {

  currentactivity = RoomConfig.config.room.defaultActivity;
  for (const input of RoomConfig.config.audio.inputs) {

    if (input.defaultMode == 'mute') {
      muteAudioInput(input.connector);
    }
    else {
      unmuteAudioInput(input.connector);
    }
    setAudioInputLevel(input.connector, input.normal);

  }


  tgl_autoDisplayMode = new Rkhelper.UI.Toggle(TGL_AUTODISPLAYMODE, 'on');
  if (RoomConfig.config.room.lightsControl) {
    tgl_autoLightsMode = new Rkhelper.UI.Toggle(TGL_AUTOLIGHTSMODE, 'on');
  }


  xapi.Command.UserInterface.Extensions.Widget.SetValue({
    WidgetId: 'preslocation',
    Value: RoomConfig.config.room.defaultPresenterLocation
  });
  presenterLocation = 'local';
  changePresenterLocationLocal();

  if (RoomConfig.config.room.showActivities) {


    xapi.Command.UserInterface.Extensions.Widget.SetValue({
      WidgetId: 'currentactivity',
      Value: RoomConfig.config.room.defaultActivity
    });
  }

  xapi.Command.Audio.Microphones.Unmute();
  xapi.Command.Audio.Volume.Set({ Level: RoomConfig.config.audio.defaultVolume });

  setCeilingMicsMode('on');

  showdisplaycontrols = false;
  showlightcontrols = false;
  updateUiElements();

}

function getActivity(id) {
  var act;
  for (const activity of RoomConfig.config.room.activities) {
    if (activity.id == id) {
      if (DEBUG)
        console.log('Found activity: ' + activity.name);
      act = activity;
    }
  }
  return act;
}

function updateUiElements() {
  xapi.Command.UserInterface.Extensions.Widget.SetValue({
    WidgetId: TGL_AUTODISPLAYMODE,
    Value: boolToOnOff(!showdisplaycontrols)
  }).catch();
  if (RoomConfig.config.room.lightsControl) {
    xapi.Command.UserInterface.Extensions.Widget.SetValue({
      WidgetId: TGL_AUTOLIGHTSMODE,
      Value: boolToOnOff(!showlightcontrols)
    }).catch();
  }
  for (const input of RoomConfig.config.audio.inputs) {
    xapi.Command.UserInterface.Extensions.Widget.SetValue({
      WidgetId: `audioinput_${input.connector}`,
      Value: input.defaultMode
    });
  }

  if (showdisplaycontrols) {
    xapi.Command.UserInterface.Extensions.Widget.SetValue({
      WidgetId: 'tvpower',
      Value: controller.disp_tv.getStatus()
    });
    xapi.Command.UserInterface.Extensions.Widget.SetValue({
      WidgetId: 'projpower',
      Value: controller.disp_proj.getStatus()
    });
  }

  if (RoomConfig.config.room.showActivities) {
    xapi.Command.UserInterface.Extensions.Widget.SetValue({
      WidgetId: 'preslocation',
      Value: presenterLocation
    });


    xapi.Command.UserInterface.Extensions.Widget.SetValue({
      WidgetId: 'currentactivity',
      Value: currentactivity
    });

    xapi.Command.UserInterface.Extensions.Widget.SetValue({
      WidgetId: TGL_CEILINGMICS,
      Value: ceilingMicsMode
    });
  }

  controller.lights.updateZoneWidgets();
}


xapi.Event.UserInterface.Extensions.Widget.Action.on(action => {
  if (action.WidgetId == TGL_AUTODISPLAYMODE) {
    showdisplaycontrols = !onOffToBool(action.Value);
    drawRoomConfigPanel();
    updateUiElements();



  }
  else if (action.WidgetId == TGL_AUTOLIGHTSMODE) {
    showlightcontrols = !onOffToBool(action.Value);
    drawRoomConfigPanel();
    updateUiElements();
  }
  else if (action.WidgetId == TGL_CEILINGMICS) {
    setCeilingMicsMode(action.Value);
  }
  else if (action.WidgetId.substring(0, 11) == 'audioinput_' && action.Type == 'pressed') {
    RoomConfig.config.audio.inputs.forEach(function (element, index) {
      if ('audioinput_' + element.connector == action.WidgetId) {
        RoomConfig.config.audio.inputs[index].mode = action.Value;
        if (action.Value == 'mute') {
          muteAudioInput(element.connector);
        }
        else {
          unmuteAudioInput(element.connector);
          setAudioInputLevel(element.connector, getAudioLevelFor(index, action));
        }
      }
    });
  }
  else if (action.WidgetId == 'currentactivity') {
    currentactivity = getActivity(action.Value).id;

    xapi.Command.UserInterface.Message.TextLine.Display({
      Text: `Lancement de l'activité "${getActivity(action.Value).name}"`,
      Duration: 2
    });
    Rkhelper.UI.prompt.display({
      Duration: 2,
      Title: `Changement d'activité`,
      Text: `Lancement de l'activité "${getActivity(action.Value).name}"`
    },
      response => {

      },
      cancel => {

      });
  }

});

xapi.Event.UserInterface.Extensions.Panel.Clicked.on(panel => {
  if (panel.PanelId == 'roomconfig') {
    updateUiElements();
  }
});

function getAudioLevelFor(input, action) {
  input = RoomConfig.config.audio.inputs[input];
  var newLevel;
  switch (action.Value) {
    case 'normal':
      return input.normal;
    case 'loud':
      newLevel = input.normal + RoomConfig.config.audio.loud;
      if (newLevel > 70) {
        return 70;
      }
      else {
        return newLevel;
      }
      break;
    case 'louder':
      newLevel = input.normal + RoomConfig.config.audio.louder;
      if (newLevel > 70) {
        return 70;
      }
      else {
        return newLevel;
      }
      break;
  }
}
function muteAudioInput(input) {
  xapi.Config.Audio.Input.Microphone[input].Mode.set('off');
}
function unmuteAudioInput(input) {
  xapi.Config.Audio.Input.Microphone[input].Mode.set('on');
}
function setAudioInputLevel(input, level) {
  xapi.Config.Audio.Input.Microphone[input].Level.set(level);
}

function onOffToBool(value) {
  if (value.toLowerCase() == 'on')
    return true;
  return false;
}
function boolToOnOff(value) {
  if (value)
    return 'on';
  return 'off';
}

function setCeilingMicsMode(mode) {
  if (mode == 'on') {
    ceilingMicsMode = 'on';
    unmuteAudioInput(1);
    unmuteAudioInput(2);
    unmuteAudioInput(3);
    unmuteAudioInput(4);
    unmuteAudioInput(5);
  }
  else {
    ceilingMicsMode = 'off';
    muteAudioInput(1);
    muteAudioInput(2);
    muteAudioInput(3);
    muteAudioInput(4);
    muteAudioInput(5);
  }
}

xapi.Event.UserInterface.Extensions.Widget.on(event => {
  if (event.Action != undefined) {
    if (event.Action.WidgetId == 'preslocation' && event.Action.Type == 'pressed') {
      presenterLocation = event.Action.Value;
    }
  }
});

function init(c) {
  changePresenterLocationLocal = Rkhelper.IMC.getFunctionCall('changePresenterLocationLocal');
  changePresenterLocationRemote = Rkhelper.IMC.getFunctionCall('changePresenterLocationRemote');

  controller = c;
  drawRoomConfigPanel();
  setDefaultValues();

  Rkhelper.IMC.callFunction('ui_InitDone');
  xapi.Status.Standby.State.on(value => {
    if (value == 'Standby') {
      setDefaultValues();
      drawRoomConfigPanel();
    }
    else if (value == 'Off') {
      setDefaultValues();
      drawRoomConfigPanel();
    }

  });

  Rkhelper.statusChangeCallback = Rkhelper.Status.addStatusChangeCallback(status => {
    if (status.callStatus.Status == 'Connected' && status.presentationStatus.remotePresentation && presenterLocation == 'local') {
      Rkhelper.UI.prompt.display({
        Duration: 15,
        FeedbackId: 'switchtoremotepres',
        Title: `Emplacement du présentateur`,
        Text: `La présentation semble provenir de l'extérieur.<br><br>Voulez-vous changer le mode d'affichage pour "Présentateur à distance" ?`,
        Options: [
          {
            label: `Non, le présentateur est ici`,
            callback: function () { }
          },
          {
            label: 'Oui, le présentateur est à distance',
            callback: function () {
              xapi.Command.UserInterface.Extensions.Widget.SetValue({
                WidgetId: 'preslocation',
                Value: 'remote'
              });
              changePresenterLocationRemote();
              presenterLocation = 'remote';
            }
          }
        ]
      },
        cancel => {

        });


    }
  });

  xapi.Status.Call.on(e => {
    switch (e.RemoteNumber) {
      case '.help':
        msgbox('help', '.help .unlock .lock .restart .info');
        clearCallHistory();
        break;

      case '.unlock':
        xapi.Config.UserInterface.SettingsMenu.Mode.set('Unlocked');
        clearCallHistory();
        msgbox('Configuration', 'UNLOCKED');
        break;

      case '.lock':
        xapi.Config.UserInterface.SettingsMenu.Mode.set('Locked');
        clearCallHistory();
        msgbox('Configuration', 'LOCKED');
        break;

      case '.restart':
        clearCallHistory();
        msgbox('restart', 'Macro runtime restarting...');
        xapi.Command.Macros.Runtime.Restart();
        break;

      case '.info':
        msgbox('info', `System Name: ${RoomConfig.config.room.name}<br>Version ${RoomConfig.config.version}`);
        clearCallHistory();
        break;

    }
  });


}
function clearCallHistory() {
  setTimeout(() => {
    xapi.Command.CallHistory.DeleteAll();
  }, 5000);
}
function msgbox(title, text) {
  xapi.Command.UserInterface.Message.Prompt.Display(
    { Duration: 0, "Option.1": 'OK', Text: text, Title: title });
}

module.exports.init = init;

