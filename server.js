const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const cors = require("cors");
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");

/* Database */
const sqlite3 = require("sqlite3").verbose();

/* app setup */
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));
app.use(cors());

/* Data base creation */
const db = new sqlite3.Database("./hRingDB.db", (err) => {
  if (err) console.error(err.message);
  else console.log("SQLite ready");
  initDB();
});

/* Tables Creation */
function initDB() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS participants (
        dbId INTEGER PRIMARY KEY AUTOINCREMENT,   
        participantId TEXT NOT NULL,              
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

    db.run(`
      CREATE TABLE IF NOT EXISTS trials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dbId INTEGER NOT NULL, 
        participantId INTEGER NOT NULL,
        trialIndex INTEGER NOT NULL,
        mode TEXT,
        min REAL,
        max REAL,
        calibration REAL,
        startTime INTEGER,
        stopTime INTEGER,
        canvas TEXT,
        pleasant REAL,
        focus REAL,
        realism REAL,
        FOREIGN KEY (dbId) REFERENCES participants(dbId)
      )
    `);

    console.log("Tables ready");
  });
}
/* Save current participant sessions */
const participantSessions = {};

/* Starting data */
const START_TRIALS = [
  { mode: "up", min: 0, max: 100 },
  { mode: "up", min: 25, max: 100 },
  { mode: "up", min: 50, max: 100 },
  { mode: "up", min: 75, max: 100 },

  { mode: "down", min: 0, max: 100 },
  { mode: "down", min: 25, max: 100 },
  { mode: "down", min: 50, max: 100 },
  { mode: "down", min: 75, max: 100 },

  { mode: "olymp", min: 0, max: 100 },
  { mode: "olymp", min: 25, max: 100 },
  { mode: "olymp", min: 50, max: 100 },
  { mode: "olymp", min: 75, max: 100 },

  { mode: "tartarus", min: 0, max: 100 },
  { mode: "tartarus", min: 25, max: 100 },
  { mode: "tartarus", min: 50, max: 100 },
  { mode: "tartarus", min: 75, max: 100 },
];

/* DB REST Endpoints */
/* start Trials */
app.get("/db/start-trials", (req, res) => {
  const withIndex = START_TRIALS.map((t, i) => ({
    id: i + 1,
    mode: t.mode,
    min: t.min,
    max: t.max,
  }));
  res.json(withIndex);
});

/* create new participant for DB */
app.post("/db/participant", (req, res) => {
  const { participantId } = req.body;

  if (!participantId) {
    return res.status(400).json({ error: "participantId required" });
  }

  db.run(
    "INSERT INTO participants (participantId) VALUES (?)",
    [participantId],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ dbId: this.lastID });
    },
  );
});

/* Receive Participant ID from admin and load already saved trials*/
app.get("/db/trials/:participantId", (req, res) => {
  const { participantId } = req.params;

  db.all(
    "SELECT * FROM trials WHERE participantId=? ORDER BY trialIndex",
    [participantId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      // Map to the shape Tabulator expects
      const formatted = rows.map((r) => ({
        id: r.trialIndex,
        mode: r.mode,
        min: r.min,
        max: r.max,
      }));

      res.json(formatted);
    },
  );
});

/* save/replace trial data for the current trial and participant */
app.post("/db/trials", (req, res) => {
  const { dbId, participantId, trials } = req.body;

  // Replace existing trials for this participant
  db.serialize(() => {
    db.run("DELETE FROM trials WHERE participantId=?", [participantId]);

    const stmt = db.prepare(`
      INSERT INTO trials (participantId, trialIndex, mode, min, max)
      VALUES (?, ?, ?, ?, ?)
    `);

    trials.forEach((t, i) => {
      stmt.run(dbId, participantId, i + 1, t.mode, t.min, t.max);
    });

    stmt.finalize((err) => {
      if (err) return res.status(500).json({ error: err.message });
      console.log("Trials inserted successfully:", trials.length);
      res.json({ status: "saved", count: trials.length });
    });
  });
});

/* Study State */
let currentStudy = {
  dbId: null,
  participantId: null,
  trialIndex: 0,
};

io.on("connection", (socket) => {
  /* console.log("Client connected:", socket.id); */

  /* Initialize session for the current Participant */
  participantSessions[socket.id] = {
    calibrationValue: null,
    startTime: null,
    stopTime: null,

    canvas: null,
    pleasant: null,
    focus: null,
    realism: null,

    participantDbId: null,
    trialIndex: 0,
  };

  /* Admin sends shuffled array back and gives okay to start Trial*/
  socket.on("startTrial", (data) => {
    console.log("Trial started by admin");

    if (!data) {
      console.warn("startTrial: missing data");
      socket.broadcast.emit("trialStarted", { trials: [] });
      return;
    }

    const { dbId, participantId, trials } = data;
    currentStudy.dbId = data.dbId;
    currentStudy.participantId = participantId;
    currentStudy.trialIndex = 1;
    socket.broadcast.emit("trialStarted", { trials: trials ?? [] });
  });

  /* Admin sends and approved/changed trial */
  socket.on("sendTrial", (trial) => {
    console.log("Trial approved by admin:", trial);

    socket.broadcast.emit("trialData", trial);
  });

  /* Drawn Points */
  socket.on("drawnPoints", (points) => {
    console.log("Received drawn points from admin:", points);
    console.log(`Total points: ${points.length}`);

    socket.broadcast.emit("points", points);
  });

  /* Participant */
  socket.on("finishedCalibration", (value) => {
    console.log("Calibration finished!");
    participantSessions[socket.id].calibrationValue = value;
    socket.broadcast.emit("finishedCalibration", value);
  });
  socket.on("showQuestionnaire", () => {
    socket.broadcast.emit("showQuestionnaire");
  });

  /* Slider Value for Admin*/
  socket.on("sliderValue", (value) => {
    console.log("Slider Value:", value);
    socket.broadcast.emit("sliderValue", value);
  });
  /* Slider Value for Pico */
  socket.on("picoValue", (value) => {
    console.log("Pico Value:", value);

    sendToPico(value);
  });

  socket.on("startTime", (timestamp) => {
    participantSessions[socket.id].startTime = timestamp;
  });

  socket.on("stopTime", (timestamp) => {
    participantSessions[socket.id].stopTime = timestamp;
  });

  socket.on("canvas", (canvas) => {
    participantSessions[socket.id].canvas = canvas;
    socket.broadcast.emit("canvas", canvas);
  });

  // Pleasant slider update
  socket.on("pleasantUpdate", (value) => {
    participantSessions[socket.id].pleasant = value;
    socket.broadcast.emit("pleasantUpdate", value);
  });

  // Focus slider update
  socket.on("focusUpdate", (value) => {
    participantSessions[socket.id].focus = value;
    socket.broadcast.emit("focusUpdate", value);
  });

  // Realism slider update
  socket.on("realismUpdate", (value) => {
    participantSessions[socket.id].realism = value;
    socket.broadcast.emit("realismUpdate", value);
  });

  /* Participant finished questionnaire, sends it to DB to be safed*/
  socket.on("finishedQuestionnaire", (data) => {
    console.log("Participant finished questionnaire:", data);
    socket.broadcast.emit("finishedQuestionnaire", data);

    const session = participantSessions[socket.id];

    // Backup
    session.canvas = data.canvas ?? session.canvas;
    session.pleasant = data.pleasant ?? session.pleasant;
    session.focus = data.focus ?? session.focus;
    session.realism = data.realism ?? session.realism;
    console.log(
      "Saving trial — participantDbId:",
      currentStudy.participantDbId,
      "trialIndex:",
      currentStudy.trialIndex,
    );
    /* save collected data to db */
    db.run(
      `
      UPDATE trials SET
        calibration=?,
        startTime=?,
        stopTime=?,
        canvas=?,
        pleasant=?,
        focus=?,
        realism=?
      WHERE dbId=? AND trialIndex=?
      `,
      [
        session.calibrationValue,
        session.startTime,
        session.stopTime,

        session.canvas,
        session.pleasant,
        session.focus,
        session.realism,

        currentStudy.participantId,
        currentStudy.trialIndex,
      ],
      function (err) {
        if (err) {
          console.error("DB Save Error:", err);
        } else {
          console.log("Trial saved:", this.changes);
        }
      },
    );
    currentStudy.trialIndex += 1;
    /* tell admin that the partcicipant is ready for the neyt run */
    socket.broadcast.emit("participantReady", data);
  });

  socket.on("disconnect", () => {
    delete participantSessions[socket.id];
  });
});

/* Pico REST Functions */

/* save values */
app.post("/save/calibrationValue", (req, res) => {
  const { value } = req.body;
  res.json({ status: "ok" });
});

let port;
let parser;

//autoconnect to correct port, not hardcoded anymore
async function initializeSerial() {
  try {
    const ports = await SerialPort.list();

    // Log all ports
    /* console.log("Available ports:", ports); */

    const picoPort = ports.find(
      (p) => p.vendorId === "2e8a", // Raspberry Pi Pico vendor ID
    );

    if (!picoPort) {
      console.error("❌ Pico not found");
      return;
    }

    port = new SerialPort({
      /* path: "/dev/ttyACM0", */
      path: picoPort.path,
      baudRate: 9600,
      /* autoOpen: false, */
    });

    // Parser for received data
    parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

    port.on("open", () => {
      console.log(`Connected to Pico on ${picoPort.path}`);
      resetMotors();
    });

    parser.on("data", (data) => {
      console.log(`Received from Pico: ${data}`);
    });

    port.on("error", (err) => {
      console.error("Serial error:", err.message);
    });
  } catch (err) {
    console.error("Failed to initialize serial port:", err);
  }
}

function sendToPico(value) {
  if (!port || !port.isOpen) {
    console.warn("Serial port not open — cannot send");
    return;
  }

  const message = `${value}\n`;
  port.write(message, (err) => {
    if (err) console.error("Serial write failed:", err.message);
  });
}
//reset Motors after every mode chnage
function resetMotors() {
  console.log("Resetting motors to 0...");
  sendToPico(0);
}

// Pico value handler
app.get("/save/calibrationMain/:currentCalVal", (req, res) => {
  const currentCalVal = req.params.currentCalVal;
  console.log(`Received Cal Value: ${currentCalVal} `);

  sendToPico(currentCalVal);

  res.send("Cal Value received and sent");
});

app.get("/save/main/:picoValue", (req, res) => {
  const picoValue = req.params.picoValue;
  console.log(`Received Value: ${picoValue} `);

  sendToPico(picoValue);
});
// Shutdown
process.on("SIGINT", () => {
  console.log("Shutting down server...");

  db.close(() => {
    console.log("SQLite closed");

    if (port && port.isOpen) {
      port.close(() => process.exit(0));
    } else {
      process.exit(0);
    }
  });
});

/* redirects for deployment */
app.get("/", (req, res) => {
  res.redirect("/participant");
});

app.get("/participant", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "participant.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// Start Server on Port 3000
server.listen(3000, "0.0.0.0", () => {
  console.log("Server is running");
  initializeSerial();
});

module.exports = { app, server, db };
