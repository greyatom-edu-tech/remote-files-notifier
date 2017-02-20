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
var typeOfEvent = "remote-file-change";

socket.on('connect', function() {
	connected = true;
	socket.emit('room', room);
});

var getPathToFile = function (path) {
  var index = path.lastIndexOf('/');
  return pathToFile = path.substr(0, index);
};

var emitEvent = function (path, event) {
	var data = {
		"room": room,
		"type": typeOfEvent,
		"title": event,
		"message": path,
	};
	var payload = JSON.stringify(data);
	socket.emit('message', payload);
};

var commonCallback = function (path, event) {
	var pathToFile = getPathToFile(path);
	emitEvent(pathToFile, event);
};

var commonCallbackWithEvent = function (event) {
	return function (path) {
		commonCallback(path, event);
	}
}

var watcher = chokidar.watch(config[":workspace"], {
  ignored: /(^|[\/\\])\../,
  persistent: true
});

// Add event listeners.
watcher
	.on('add', commonCallbackWithEvent('addFile'))
	.on('change', (path) => {
		emitEvent('changeFile', path);
	})
	.on('unlink', (path) => {
		var pathToFile = getPathToFile(path);
		if (!fs.existsSync(pathToFile)) {
			pathToFile = getPathToFile(pathToFile);
		}
		emitEvent('unlinkFile', pathToFile);
	})
	.on('addDir', commonCallbackWithEvent('addDir'))
	.on('unlinkDir', commonCallbackWithEvent('unlinkDir'));