"use strict";
const assert = require("assert"),
      card = require("../lib/card"),
      fs = require("fs-extra"),
      mockFs= require("mock-fs"),
      async = require("async"),
      strftime = require("strftime"),
      sampleCard = {
        reportFormat: "default",
        hourlyRate: 50.00,
        card: [
          {
            date: "Sun Jan 24 2016",
            times: [{
              start: "07:44:00",
              end: "07:45:00"
            }, {
              start: "07:46:00",
              end: "07:47:00"
            }]
          }
        ]
      }

describe('clock.assertIsCard()', function() {
  it("should assert good cards as true", function() {
    assert(card.assertIsCard({card: []}));
    assert(card.assertIsCard({card: [{date: "Fri Feb 19 2016", times: []}]}));
    assert(card.assertIsCard({card: [
      {date: "Fri Feb 19 2016", times: [{start: "12:20:00"}]}
    ]}));
    assert(card.assertIsCard({card: [
      {date: "Fri Feb 19 2016", times: [{
        start: "2:20:00",
        end: "2:30:00",
      }]}
    ]}));
    assert(card.assertIsCard({card: [
      {date: "Fri Feb 19 2016", times: [{
        start: "2:20:00",
        end: "2:30:00",
      }, {
        start: "4:40:00",
        end: "5:31:23",
      }, {
        start: "5:66:77",
      }]}
    ]}));
    assert(card.assertIsCard({card: [
      {date: "Fri Feb 19 2016", times: [{
        start: "2:20:00",
        end: "2:30:00",
      }]},
      {date: "Fri Feb 18 2016", times: [{
        start: "2:20:00",
        end: "2:30:00",
      }]},
    ]}));
    assert(card.assertIsCard({card: [
      {date: "Fri Feb 19 2016", times: [{
        start: "2:20:00",
        end: "2:30:00",
      }]},
      {date: "Mon Feb 22 2016", times: [{
        start: "2:20:00",
        end: "2:30:00",
        disabled: "Wed Feb 24 2016"
      }]},
    ]}));
  });
  it("should assert bad cards as false", function() {
    assert(!card.assertIsCard("not an object"));
    assert(!card.assertIsCard({card: ["not an object"]}));
    assert(!card.assertIsCard({card: [{date: "Fri Feb 19 2016", times: ["not an object"]}]}));
    assert(!card.assertIsCard({card: [{date: "Fri Feb 19 2016", times: [{end: "no start"}]}]}));
    assert(!card.assertIsCard({card: [ // a smart ass with unix epoch time
      {date: 11111, times: [{
        start: 123,
        end: 456,
      }]}
    ]}));
  });
});

describe('clock.getSpotForDay()', function() {
  it('should pick the correct timecard section for the current day', function() {
    assert.deepEqual(card.getSpotForDay([{date: strftime(card.DAY_REPR), foo: "bar"}]), {
      date: strftime(card.DAY_REPR),
      foo: "bar"
    });
    assert.deepEqual(card.getSpotForDay([
      {
        date: strftime(card.DAY_REPR),
        foo: "bar",
      }, {
        date: "something else",
        foo: "baz",
      }
    ]), {
      date: strftime(card.DAY_REPR),
      foo: "bar"
    });
  });
});

describe('clock.totalDuration()', function() {
  it('should get the total duration of all cards', function() {
    assert.equal(card.totalDuration({card: []}), 0);
    assert.equal(card.totalDuration({
      card: [
        {
          date: "Mon Feb 22 2016",
          times: [{
            start: "11:00:00",
            end: "12:00:00"
          }],
        }
      ]
    }), 3600); // 1 hour in seconds
    assert.equal(card.totalDuration({
      card: [
        {
          date: "Mon Feb 22 2016",
          times: [{
            start: "11:00:00",
            end: "12:00:00"
          }, {
            start: "3:00:00",
            end: "4:30:30",
          }],
        }
      ]
    }), 9030); // 2 hours, 30 minutes, and 30 seconds in seconds
    assert.equal(card.totalDuration({
      card: [
        {
          date: "Mon Feb 22 2016",
          times: [{
            start: "3:00:00",
            end: "4:00:00",
          }],
        },
        {
          date: "Mon Feb 22 2016",
          disabled: "Mon Feb 22 2016",
          times: [{
            start: "3:00:00",
            end: "4:30:30",
          }],
        }
      ]
    }), 3600); // 1 hour (the second one is disabled)
    assert.equal(card.totalDuration({ // test to be sure the callback for each iteraction works, too
      card: [
        {
          date: "Mon Feb 22 2016",
          times: [{
            start: "3:00:00",
            end: "4:00:00",
          }],
        },
        {
          date: "Mon Feb 22 2016",
          disabled: "Mon Feb 22 2016",
          times: [{
            start: "3:00:00",
            end: "4:30:30",
          }],
        }
      ]
    }, (day, time) => {
      if (day.disabled) {
        assert.equal(day.date, "Mon Feb 22 2016");
        assert.deepEqual(time, {start: "3:00:00", end: "4:30:30"});
      } else {
        assert.equal(day.date, "Mon Feb 22 2016");
        assert.deepEqual(time, {start: "3:00:00", end: "4:00:00"});
      }
    }), 3600); // 1 hour (the second one is disabled)
  });
});

describe('clock.getReportTemplate()', function() {
  it('should get the report for a github repo', function(done) {
    card.getReportTemplate("1egoman/clockmaker:templates/testing.ejs").then((data) => {
      assert.equal(data, "Hello World!\n");
      done();
    }).catch(console.error.bind(console));
  });
  it('should get the report for a default entry', function(done) {
    card.getReportTemplate("testing").then((data) => {
      assert.equal(data, "Hello World!\n");
      done();
    }).catch(console.error.bind(console));
  });
});

describe('clock.getCard()', function() {
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

describe('clock.getTimecardRenderDetails()', function() {
  it('should correctly return the timecard', function() {
    assert.deepEqual(card.getTimecardRenderDetails({card: []}, {}), {
      timecard: {card: []},
      args: {},
      totalTime: 0,
      totalCost: null,
    });

    let card_for_test = [
      {
        date: "Mon Feb 22 2016", times: [
          {
            start: "10:00:00", end: "11:00:00"
          }
        ]
      }
    ];
    assert.deepEqual(card.getTimecardRenderDetails({card: card_for_test}, {}), {
      timecard: {card: card_for_test},
      args: {},
      totalTime: 3600,
      totalCost: null,
    });
  });
  it('should correctly calculate the cost of a timecard', function() {
    assert.deepEqual(card.getTimecardRenderDetails(sampleCard), {
      timecard: sampleCard,
      args: {},
      totalTime: 120,
      totalCost: 1.67,
    });
  });
  it('should be sure that any args passd are returned', function() {
    assert.deepEqual(card.getTimecardRenderDetails({card: []}, {foo: "bar", another: 1}), {
      timecard: {card: []},
      args: {foo: "bar", another: 1},
      totalTime: 0,
      totalCost: null,
    });
    assert.deepEqual(card.getTimecardRenderDetails({card: [], args: {foo: "bar", another: 1}}), {
      timecard: {
        args: {foo: "bar", another: 1},
        card: [],
      },
      args: {foo: "bar", another: 1},
      totalTime: 0,
      totalCost: null,
    });
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

  describe("mock fs causing error", function() {
    before(() => mockFs());
    after(() => mockFs.restore());
    it('should reject on error', function(done) {
      card.cardInit().then(done).catch(() => {
        done();
      });
    });
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

  it('should error when clocking out without clocking in', function(done) {
    card.clockOut().catch((err) => {
      assert.equal(err.message, "You never clocked in!");
      done();
    });
  });

  it('should error when clocking out without clocking in', function(done) {
    card.clockIn()
    .then(card.clockOut)
    .then(() => {
      card.clockOut().catch((err) => {
        assert.equal(err.message, "There aren't any currently open times that can be closed.");
        done();
      });
    });
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
