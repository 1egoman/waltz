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
