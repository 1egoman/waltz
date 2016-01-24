"use strict";
const Promise = require("promise"),
      fs = require("fs");

// find the latest `.timecard.json` file. This function recurses to find
// `.timecard.json` files that are further down the tree to allow `clock`s use in
// subfolders.
exports.getCard = function(path, n, err) {
  n = Number.isFinite(n) ? n : 10 // max recusrion amount
  path = path || ".timecard.json";

  return new Promise((resolve, reject) => {

    if (n <= 0) {
      return reject(`
We couldn't find your \`.timecard.json\` file! You can run \`clock init\` to make
one.
${err}
  `);
    }

    fs.readFile(path, 'utf8', (err, data) => {
      if (err) {
        exports.getCard(`../${path}`, n - 1, err).then(resolve).catch(reject);
      } else {
        resolve(JSON.parse(data));
      }
    })
  });
}

