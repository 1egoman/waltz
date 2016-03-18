"use strict";
const assert = require("assert"),
      index = require("../lib/index"),
      card = require("../lib/card"),
      sinon = require("sinon"),
      chalk = require("chalk"),
      fs = require("fs"),
      mockFs = require("mock-fs"),
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
      sinon.stub(card, "getReportTemplate", () => {
        return new Promise((resolve, reject) => {resolve(`
          Timecard: <%= JSON.stringify(timecard) %>
          Total Time: <%= totalTime %>
          Total Cost: <%= totalCost %>
          [end]`
        )});
      });
      sinon.spy(console, "log");
      mockFs();
    });
    afterEach(() => {
      card.getCard.restore();
      card.getReportTemplate.restore();
      console.log.restore();
      mockFs.restore();
    });

    it("should spit out an invoice when run with 'report' to a file", function(done) {
      index.run("report", {}, () => {
        assert(card.getCard.calledWithExactly());
        assert(card.getReportTemplate.calledWith("default"));
        fs.readFile("report.html", (err, contents) => {
          if (err) {
            done(err);
          } else {
            assert.deepEqual(contents.toString(), `
          Timecard: {&#34;card&#34;:[]}
          Total Time: 0
          Total Cost: 
          [end]`);
            done();
          }
        });
      });
    });
    it("should spit out an invoice when run with 'report' to stdout", function(done) {
      index.run("report", {print: true}, () => {
        assert(card.getCard.calledWithExactly());
        assert(card.getReportTemplate.calledWith("default"));
        assert(console.log.calledWith(`
          Timecard: {&#34;card&#34;:[]}
          Total Time: 0
          Total Cost: 
          [end]`));
        done();
      });
    });
  });
});
