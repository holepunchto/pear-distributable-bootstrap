const test = require('brittle')


// mock pear-updater-bootstrap, just check it's passed correct things

// create IPC.Server at custom pear-dir, pass lock to Server,
// send back mocked run { tag, data } + { bail } + etc
