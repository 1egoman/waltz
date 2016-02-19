"use strict";
const assert = require("assert"),
      watch = require("../lib/watch"),
      fs = require("fs-extra"),
      mockFs= require("mock-fs"),
      async = require("async"),
      strftime = require("strftime");

describe('watch.getWatchArgsFor', function() {
  it("should use defaults when nothing is passed", function() {
    assert.deepEqual(watch.getWatchArgsFor({}), {
      ignored: /([\/\\]\.|node_modules|\.timecard\.json|\.git)/,
      verbose: false,
      quiet: false,
      watchDir: '.',
      oldfile: 10 * 60 * 1000, // 10 minutes
    });
  });
  it("should inherit from passed args", function() {
    assert.deepEqual(watch.getWatchArgsFor({
      v: true,
      quiet: true,
      watchDir: '/foo/bar/baz'
    }), {
      ignored: /([\/\\]\.|node_modules|\.timecard\.json|\.git)/,
      verbose: true,
      quiet: true,
      watchDir: '/foo/bar/baz',
      oldfile: 10 * 60 * 1000, // 10 minutes
    });
    assert.deepEqual(watch.getWatchArgsFor({
      ignored: "abc",
      expires: 15,
    }), {
      ignored: /abc/,
      verbose: false,
      quiet: false,
      watchDir: '.',
      oldfile: 15 * 60 * 1000, // 10 minutes
    });
  });
});

describe('watch.isCurrentStateNotStale', function() {
  it("should show a stale state when the time delay has expired, otherwise nothing", function() {
    let now = new Date().getTime();
    assert.equal(watch.isCurrentStateNotStale({oldfile: 1000}, now - 5000, true), false);
    assert.equal(watch.isCurrentStateNotStale({oldfile: 1000}, now - 5000, false), false);
    assert.equal(watch.isCurrentStateNotStale({oldfile: 1000}, now - 100, true), true);
    assert.equal(watch.isCurrentStateNotStale({oldfile: 1000}, now - 100, false), false);
  });
});

describe('watch.newFileChangeEvent', function() {
  it("should update the state when a new file event comes in ant the state is falsey", function() {
    assert.equal(watch.newFileChangeEvent({}, "change", "file.txt", false), true);
    assert.equal(watch.newFileChangeEvent({}, "change", "file.txt", true), true);
    // verify logging doesn't make a difference in functionality
    assert.equal(watch.newFileChangeEvent({verbose: true}, "add", "file.txt", true), true);
  });
});
