"use strict";
const assert = require("assert"),
      card = require("../lib/card"),
      fs = require("fs-extra"),
      async = require("async"),
      sampleCard = {
        reportFormat: "default",
        hourlyRate: 50.00,
        card: [
          {
            date: "Sun Jan 24 2016",
            times: [{
              start: "07:44:17",
              end: "07:44:26"
            }]
          }
        ]
      }

describe('clock.getCard()', function () {
  // remove the files afterward
  // don't remove .timecard.json though, we'll need that one for further tests
  after((done) => {
    async.map([
      "../timecard.json",
      "../../timecard.json"
    ], fs.remove, done)
  });

  it('should find a .timecard.json in one last folder', function () {
    fs.writeFile("../../.timecard.json", JSON.stringify(sampleCard));

    card.getCard().then((card) => {
      assert.deepEqual(card, sampleCard);
    })
  });

  it('should find a .timecard.json in another folder', function () {
    fs.writeFile("../.timecard.json", JSON.stringify(sampleCard));

    card.getCard().then((card) => {
      assert.deepEqual(card, sampleCard);
    })
  });

  it('should find a .timecard.json', function () {
    fs.writeFile(".timecard.json", JSON.stringify(sampleCard));

    card.getCard().then((card) => {
      assert.deepEqual(card, sampleCard);
    })
  });
});

describe('clock.cardInit()', function() {
  beforeEach((done) => {
    fs.remove(".timecard.json", done);
  });

  it('should create a new timecard', function(done) {
    card.cardInit().then(() => {
      fs.readFile(".timecard.json", "utf8", (err, data) => {
        if (err) {
          done(err);
        } else {
          assert.deepEqual(JSON.parse(data), {
            "reportFormat": "default",
            "hourlyRate": 0,
            "card": []
          });
          done();
        }
      });
    }).catch(done);
  });
});

describe('clock.clockIn()', function() {
  beforeEach((done) => {
    fs.writeFile(".timecard.json", JSON.stringify({card: []}), done);
  });

  it('should clock in at this time', function(done) {
    card.clockIn().then((opts) => {
      card.getCard().then((timecard) => {
        assert.deepEqual(timecard, {
          card: [{
            date: opts.day,
            times: [{
              start: opts.time
            }]
          }]
        });
        done();
      }).catch(done);
    }).catch(done);
  });


  it('should clock in at this time, clock out, then clock back in', function(done) {
    card.clockIn().then((opts) => {
      card.getCard().then((timecard) => {
        assert.deepEqual(timecard, {
          card: [{
            date: opts.day,
            times: [{
              start: opts.time
            }]
          }]
        });

        card.clockOut().then((out_opts) => {
          card.getCard().then((timecard) => {
            assert.deepEqual(timecard, {
              card: [{
                date: opts.day,
                times: [{
                  start: opts.time,
                  end: out_opts.time
                }]
              }]
            });

            card.clockIn().then((second_opts) => {
              card.getCard().then((timecard) => {
                console.log(timecard.card[0].times)
                assert.deepEqual(timecard, {
                  card: [{
                    date: opts.day,
                    times: [{
                      start: opts.time,
                      end: out_opts.time
                    }, {
                      start: second_opts.time
                    }]
                  }]
                });
                done();
              });
            });
          }).catch(done);
        }).catch(done);
      }).catch(done);
    }).catch(done);
  });
});

describe('clock.clockOut()', function() {
  beforeEach((done) => {
    fs.writeFile(".timecard.json", JSON.stringify({card: []}), done);
  });

  it('should clock in at this time, then clock out', function(done) {
    card.clockIn().then((opts) => {
      card.getCard().then((timecard) => {
        assert.deepEqual(timecard, {
          card: [{
            date: opts.day,
            times: [{
              start: opts.time
            }]
          }]
        });

        card.clockOut().then((out_opts) => {
          card.getCard().then((timecard) => {
            assert.deepEqual(timecard, {
              card: [{
                date: opts.day,
                times: [{
                  start: opts.time,
                  end: out_opts.time
                }]
              }]
            });
            done();
          }).catch(done);
        }).catch(done);
      }).catch(done);
    }).catch(done);
  });
});
