/* test socket */
const { server, db } = require("../server");
const { io: Client } = require("socket.io-client");

let admin, participant;

beforeAll((done) => {
  server.listen(3001, () => {
    admin = Client("http://localhost:3001", { forceNew: true });
    participant = Client("http://localhost:3001", { forceNew: true });

    let connected = 0;
    const onConnect = () => {
      if (++connected === 2) done();
    };
    admin.on("connect", onConnect);
    participant.on("connect", onConnect);
  });
});

afterAll(() => {
  admin.disconnect();
  participant.disconnect();
  server.close();
});

/* Timeout Helper */
const withTimeout = (done, ms = 2000) => {
  const timeout = setTimeout(() => {
    done(new Error(`Test timed out after ${ms}ms`));
  }, ms);
  return () => {
    clearTimeout(timeout);
    done();
  };
};

/* startTrial */
describe("startTrial", () => {
  test("startTrial broadcasts trialStarted", (done) => {
    const finish = withTimeout(done);
    const payload = {
      participantId: 1,
      trials: [{ mode: "up", min: 25, max: 100 }],
    };

    participant.once("trialStarted", (data) => {
      expect(data.trials).toEqual(payload.trials);
      finish();
    });

    admin.emit("startTrial", payload);
  });

  test("broadcasts trialStarted empty", (done) => {
    const finish = withTimeout(done);

    participant.once("trialStarted", (data) => {
      expect(data.trials).toEqual([]);
      finish();
    });

    admin.emit("startTrial", null);
  });
});

/* sendTrial */

describe("sendTrial", () => {
  test("broadcasts trialData", (done) => {
    const finish = withTimeout(done);
    const trial = { mode: "olymp", min: 25, max: 100 };

    participant.once("trialData", (data) => {
      expect(data).toEqual(trial);
      finish();
    });

    admin.emit("sendTrial", trial);
  });
  /* no answer */
  test("no trialData", (done) => {
    const finish = withTimeout(done);
    let senderReceived = false;

    admin.once("trialData", () => {
      senderReceived = true;
    });

    participant.once("trialData", () => {
      expect(senderReceived).toBe(false);
      finish();
    });

    admin.emit("sendTrial", { mode: "tartarus", min: 0, max: 100 });
  });
});

/* finishedCalibration */

describe("finishedCalibration", () => {
  test("broadcasts calibration value to other clients", (done) => {
    const finish = withTimeout(done);

    participant.once("finishedCalibration", (value) => {
      expect(value).toBe(13);
      finish();
    });

    admin.emit("finishedCalibration", 13);
  });

  test("stores calibration value in session", (done) => {
    const finish = withTimeout(done);

    participant.once("finishedCalibration", (value) => {
      expect(value).toBe(666);
      finish();
    });

    admin.emit("finishedCalibration", 666);
  });
});
/* showQuestionnaire */
describe("showQuestionnaire", () => {
  test("broadcasts showQuestionnaire event to other clients", (done) => {
    const finish = withTimeout(done);

    participant.once("showQuestionnaire", () => {
      expect(true).toBe(true);
      finish();
    });

    admin.emit("showQuestionnaire");
  });
});

/* sliderValue */
describe("sliderValue", () => {
  test("broadcasts slider value to other clients", (done) => {
    const finish = withTimeout(done);

    participant.once("sliderValue", (value) => {
      expect(value).toBe(75);
      finish();
    });

    admin.emit("sliderValue", 75);
  });
});

/* startTime / stopTime */
describe("startTime and stopTime", () => {
  test("startTime is stored in session without broadcasting", (done) => {
    const finish = withTimeout(done);
    let received = false;

    participant.once("startTime", () => {
      received = true;
    });

    admin.emit("startTime", Date.now());
    setTimeout(() => {
      expect(received).toBe(false);
      finish();
    }, 300);
  });

  test("stopTime is stored in session without broadcasting", (done) => {
    const finish = withTimeout(done);
    let received = false;

    participant.once("stopTime", () => {
      received = true;
    });

    admin.emit("stopTime", Date.now());

    setTimeout(() => {
      expect(received).toBe(false);
      finish();
    }, 300);
  });
});
/* canvas */
describe("canvas", () => {
  test("broadcasts canvas data to other clients", (done) => {
    const finish = withTimeout(done);
    const canvasData = "data:image/png;base64,abc123";

    participant.once("canvas", (data) => {
      expect(data).toBe(canvasData);
      finish();
    });

    admin.emit("canvas", canvasData);
  });
});

/* pleasantUpdate / focusUpdate / realismUpdate */
describe("questionnaire slider updates", () => {
  test("pleasantUpdate broadcasts value to other clients", (done) => {
    const finish = withTimeout(done);

    participant.once("pleasantUpdate", (value) => {
      expect(value).toBe(3);
      finish();
    });

    admin.emit("pleasantUpdate", 3);
  });

  test("focusUpdate broadcasts value to other clients", (done) => {
    const finish = withTimeout(done);

    participant.once("focusUpdate", (value) => {
      expect(value).toBe(5);
      finish();
    });

    admin.emit("focusUpdate", 5);
  });

  test("realismUpdate broadcasts value to other clients", (done) => {
    const finish = withTimeout(done);

    participant.once("realismUpdate", (value) => {
      expect(value).toBe(7);
      finish();
    });

    admin.emit("realismUpdate", 7);
  });
});

/* finishedQuestionnaire */
describe("finishedQuestionnaire", () => {
  beforeAll((done) => {
    db.serialize(() => {
      db.run(
        "INSERT INTO participants (participantId) VALUES (?)",
        ["TEST001"],
        function () {
          const dbId = this.lastID;

          admin.emit("startTrial", {
            participantId: dbId,
            trials: [{ mode: "up", min: 25, max: 100 }],
          });

          db.run(
            "INSERT INTO trials (dbId, participantId, trialIndex, mode, min, max) VALUES (?,?,?,?,?,?)",
            [dbId, dbId, 1, "up", 25, 100],
            done,
          );
        },
      );
    });
  });

  test("broadcasts finishedQuestionnaire to other clients", (done) => {
    const finish = withTimeout(done);
    const payload = {
      canvas: "down",
      pleasant: 4,
      focus: 3,
      realism: 5,
    };

    participant.once("finishedQuestionnaire", (data) => {
      expect(data).toEqual(payload);
      finish();
    });

    admin.emit("finishedQuestionnaire", payload);
  });

  test("broadcasts participantReady after questionnaire is finished", (done) => {
    const finish = withTimeout(done);
    const payload = {
      canvas: "up",
      pleasant: 4,
      focus: 3,
      realism: 5,
    };

    participant.once("participantReady", (data) => {
      expect(data).toEqual(payload);
      finish();
    });

    admin.emit("finishedQuestionnaire", payload);
  });
});
