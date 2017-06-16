var fs = require('fs');
var path = require('path');

module.exports = function walk(paths, mode) {
  if (!paths) {
    return;
  }
  var _dir = '';
  var fd;
  var _trustDir;

  paths.split('/').forEach(function (path, index) {
    _dir += '/' + path;
    _trustDir = process.cwd() + _dir;

    if (!fs.existsSync(_trustDir)) {
      fs.mkdirSync(_trustDir, mode);
    }
  });
}

