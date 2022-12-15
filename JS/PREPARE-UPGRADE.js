import xapi from 'xapi';

const USE_BUILTIN_USBMODE = true; //true partout sauf au comtois = false
const USE_BUILTIN_ZOOM = true; //true pour utiliser le bouton/interface zoom de Cisco
const BACKGROUND = `https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/A_black_background.jpg/800px-A_black_background.jpg?20170209161534`;

async function prepareUpgrade() {
  /* Video outputs */
  console.log(`Config video`);
  await xapi.Config.Video.Monitors.set('DualPresentationOnly');
  await xapi.Config.Video.Output.Connector[1].MonitorRole.set('Second');
  await xapi.Config.Video.Output.Connector[2].MonitorRole.set('Auto');
  await xapi.Config.Video.Output.Connector[3].MonitorRole.set('First');
  console.log(`Fait!`);

  /* HDMI Passthrough (mode USB) */
  if (USE_BUILTIN_USBMODE) {
    console.log(`Config USB Mdoe`);
    await xapi.Config.Video.Output.HDMI.Passthrough.Allowed.set('True');
    await xapi.Config.Video.Output.HDMI.Passthrough.OutputConnector.set(2);
    await xapi.Config.Video.Output.HDMI.Passthrough.AutoDisconnect.Delay.set(480);
    await xapi.Config.Video.Output.HDMI.Passthrough.AutoDisconnect.Enabled.set('True');
    console.log(`Fait!`);
  }

  /* User Interface */
  console.log(`Config interface utilisateur`); 
  await xapi.Config.UserInterface.Help.Tips.set('Hidden');
  await xapi.Config.UserInterface.Features.Call.HdmiPassthrough.set(USE_BUILTIN_USBMODE ? 'Auto' : 'Hidden');
  await xapi.Config.UserInterface.Features.Call.JoinGoogleMeet.set('Hidden');
  await xapi.Command.UserInterface.Branding.Fetch({Type: 'Background', URL: BACKGROUND });
  console.log(`Fait!`);
  console.log(`Terminé! Désactivez cette macro et effacez-la.`);

  /* Zoom */
  await xapi.Config.UserInterface.Features.Call.JoinZoom.set(USE_BUILTIN_ZOOM ? 'Auto' : 'Hidden');
  await xapi.Config.Zoom.DefaultDomain.set('zmca.us');
  await xapi.Config.Zoom.DialStringOptions.set('200006');
}




console.log(`Préparation avant upgrade...`);
setTimeout(prepareUpgrade,2000);

