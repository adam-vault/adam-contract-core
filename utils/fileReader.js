const fs = require('fs');

function load (path, encoding) {
  return JSON.parse(fs.readFileSync(path, encoding));
};

function save (directory, fileName, results) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory);
  }
  fs.writeFileSync(`${directory}/${fileName}`, JSON.stringify(results));
};

module.exports = {
  save, load,
};
