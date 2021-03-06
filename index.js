var io = require('socket.io-client');
var chokidar = require('chokidar');
var yaml = require('js-yaml');
var fs = require('fs');
var netrc = require('netrc');

var userHome = '';
process.argv.forEach((val, index) => {
	if (val.indexOf('homeDir=') !== -1) {
		userHome = val.replace('homeDir=', '');
	}
});

gaConfigPath = userHome + '/.ga-config';
netrcPath = userHome + '/.netrc';
if (!(fs.existsSync(gaConfigPath) && fs.existsSync(netrcPath))) {
	console.log('User Config does not exists');
	return;
}

var connected = false;
// get workspace path to watch after
var config = yaml.safeLoad(fs.readFileSync(gaConfigPath, 'utf8'));
// get user github username for creating websocket room
var myNetrc = netrc(netrcPath);
var room = myNetrc['ga-extra'].login;
// connect to GreyAtom's websocket server
// var socket = io.connect('https://chat.commit.live', { reconnect: true });
var socket = io.connect('http://13.126.157.180:5000', { reconnect: true });
var typeOfEvent = "remote-file-change";

socket.on('connect', function() {
	connected = true;
	socket.emit('join', {
		room: room
	});
});

var getPathToFile = function (path) {
  var index = path.lastIndexOf('/');
  return pathToFile = path.substr(0, index);
};

var emitEvent = function (path, event) {
	var data = {
		"type": typeOfEvent,
		"title": event,
		"message": path,
	};
	var payload = JSON.stringify(data);
	socket.emit('my_room_event', {
		room: room,
		data: payload
	});
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
  persistent: true,
  depth: 0
});

// Add event listeners.
watcher
	.on('add', commonCallbackWithEvent('addFile'))
	.on('change', (path) => {
		emitEvent(path, 'changeFile');
	})
	.on('unlink', (path) => {
		var pathToFile = getPathToFile(path);
		if (!fs.existsSync(pathToFile)) {
			pathToFile = getPathToFile(pathToFile);
		}
		emitEvent(pathToFile, 'unlinkFile');
	})
	.on('addDir', commonCallbackWithEvent('addDir'))
	.on('unlinkDir', commonCallbackWithEvent('unlinkDir'));
