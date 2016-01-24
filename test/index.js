const assert = require("assert"),
      card = require("../lib/card"),
      fs = require("fs-extra"),
      async = require("async"),
      sampleCard = {
        reportFormat: "default",
        hourlyRate: 50.00,
        card: [
          {
            "date": "Sun Jan 24 2016",
            "startTime": "07:44:17",
            "endTime": "07:44:26"
          }
        ]
      }

describe('timeclock', function () {

  // remove the files afterward
  // don't remove .timecard.json though, we'll need that one for further tests
  after((done) => {
    async.map([
      "../timecard.json",
      "../../timecard.json"
    ], fs.remove, done)
  });


  it('should find a .timecard.json', function () {
    fs.writeFile(".timecard.json", JSON.stringify(sampleCard));

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

  it('should find a .timecard.json in one last folder', function () {
    fs.writeFile("../../.timecard.json", JSON.stringify(sampleCard));

    card.getCard().then((card) => {
      assert.deepEqual(card, sampleCard);
    })
  });
});
