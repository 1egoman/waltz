"use strict";
const assert = require("assert"),
      index = require("../lib/index"),
      card = require("../lib/card"),
      sinon = require("sinon"),
      chalk = require("chalk"),
      fs = require("fs"),
      ejs = require("ejs"),
      Promise = require("promise");

describe('lib/index.js', function() {
  describe('waltz in', function() {
    it("should waltz in when run with 'in'", function(done) {
      sinon.stub(card, "waltzIn", () => new Promise((r) => r())); // a self-resolving promise
      let log = sinon.spy(console, "log");
      index.run("in", [], () => {
        assert(log.calledWith("Waltzed in. GO!"));
        card.waltzIn.restore();
        console.log.restore();
        done();
      });
    });
  });
  describe('waltz out', function() {
    it("should waltz out when run with 'out'", function(done) {
      sinon.stub(card, "waltzOut", () => new Promise((r) => r())); // a self-resolving promise
      let log = sinon.spy(console, "log");
      index.run("out", [], () => {
        assert(log.calledWith("Waltzed out. Go work on something else."));
        card.waltzOut.restore();
        console.log.restore();
        done();
      });
    });
  });
  describe('waltz init', function() {
    it("should init a new timecard when run with 'init'", function(done) {
      sinon.stub(card, "cardInit", () => new Promise((r) => r())); // a self-resolving promise
      let log = sinon.spy(console, "log");
      index.run("init", [], () => {
        assert(log.calledWith(`Created ${chalk.cyan('`.timecard.json`')}. Start working with ${chalk.cyan('`waltz in`')}!`));
        card.cardInit.restore();
        console.log.restore();
        done();
      });
    });
  });
  describe('waltz report', function() {
    beforeEach(() => {
      sinon.stub(card, "getCard", () => new Promise((r) => r({card: []}))); // a self-resolving promise
      sinon.stub(fs, "writeFile", (a,b,cb) => cb(null));
      sinon.stub(ejs, "render", (a,b,cb) => "ejs-render-out");
    });
    afterEach(() => {
      card.getCard.restore();
      fs.writeFile.restore();
      ejs.render.restore();
    });
    it("should spit out an invoice when run with 'report'", function(done) {
      index.run("report", {print: false}, () => {
        assert(card.getCard.calledWith());
        assert.equal(fs.writeFile.getCall(0).args[0], "report.html");
        assert.equal(fs.writeFile.getCall(0).args[1], "ejs-render-out");
        done();
      });
    });
  });
});
