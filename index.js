var io = require('socket.io-client');
var chokidar = require('chokidar');
var yaml = require('js-yaml');
var fs = require('fs');
var netrc = require('netrc');
const osHomedir = require('os-homedir');

var connected = false;
// get workspace path to watch after
var config = yaml.safeLoad(fs.readFileSync(osHomedir() + '/.ga-config', 'utf8'));
// get user github username for creating websocket room
var myNetrc = netrc();
var room = myNetrc['ga-extra'].login;
// connect to GreyAtom's websocket server
var socket = io.connect('http://35.154.96.42:9000', { reconnect: true });

socket.on('connect', function() {
	connected = true;
	socket.emit('room', room);
});

chokidar.watch(config[":workspace"]).on('all', function(event, path) {
  	if (connected) {
  		var typeOfEvent = "remote-file-change";
		socket.emit('message', '{"room":"'+room+'","type":"'+ typeOfEvent +'","title":"' + event + '","message":"' + path + '"}');
  	}
});