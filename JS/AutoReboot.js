/*jshint esversion: 6 */
import xapi from 'xapi';

const rebootTime = '4:00';


var rebootTimer;

function schedule(time, action) {
  let [alarmH, alarmM] = time.split(':');
  let now = new Date();
  now = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  let difference = parseInt(alarmH) * 3600 + parseInt(alarmM) * 60 - now;
  if (difference <= 0) difference += 24 * 3600;
  return setTimeout(action, difference * 1000);
}


function rebootNow() {
  console.log('Rebooting now.');
  xapi.Command.SystemUnit.Boot({ Action: 'Restart', Force: 'True' });
}

function startRebootTimer() {
  console.log('Rebooting in 60 seconds.');
  clearTimeout(rebootTimer);
  rebootTimer = setTimeout(rebootNow,60000);
}


schedule(rebootTime, startRebootTimer);


