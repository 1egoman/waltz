"use strict";
const request = require("request"),
      Promise = require("promise");

exports.getFileFromRepo = function getFileFromRepo(username, repo, filename, branch) {
  branch = branch || "master";
  filename = filename || ".timecard.json";
  // console.log(`https://raw.githubusercontent.com/${username}/${repo}/${branch}/${filename}`, username, repo, filename)
  return new Promise((resolve, reject) => {
    request({
      method: "get",
      url: `https://raw.githubusercontent.com/${username}/${repo}/${branch}/${filename}`,
      headers: {
        "Cache-Control": "no-cache"
      }
    }, (err, resp, body) => {
      if (err) {
        reject(err);
      } else if (body === "Not Found") {
        reject("Not found")
      } else {
        try {
          let json = JSON.parse(body);
          resolve(json);
        } catch (e) {
          resolve(body);
        }
      }
    });
  });
}
