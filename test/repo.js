"use strict";
const assert = require("assert"),
      repo = require("../lib/repo"),
      fs = require("fs-extra"),
      mockFs= require("mock-fs"),
      async = require("async"),
      strftime = require("strftime"),
      sinon = require("sinon"),
      request = require("request");

describe("repo.getFileFromRepo", function() {
  it("should get a file from the repo", function(done) {
    repo.getFileFromRepo("1egoman", "waltz", "waltz", "dev").then((data) => {
      assert.equal(data, "#!/bin/bash\nnode lib/index.js $@\n");
      done();
    }).catch(done);
  });

  it("should fail on a non-existing repo", function(done) {
    repo.getFileFromRepo("1egoman", "i-am-a-bad-repo-that-doesn't-exist", "clock", "dev").then((data) => {
      done("Shouldn't have been successful.");
    }).catch((err) => {
      assert.equal(err, "Not found");
      done();
    })
  });

  it("should parse json for json files", function(done) {
    repo.getFileFromRepo("1egoman", "timeclock", "package.json", "dev").then((data) => {
      assert.equal(typeof data, "object");
      done();
    }).catch(done);
  });
});
