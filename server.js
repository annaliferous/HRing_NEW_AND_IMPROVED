const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const qs = require("qs");
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const { rejects } = require("assert");

const server = express();

server.set("query parser", (str) => qs.parse(str, {}));
server.use(cors());
server.use(express.json());

// Create Data Directory
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let port;
let parser;

async function initializeSerial() {
  try {
    const ports = await SerialPort.list();

    // Log all ports once for debugging
    console.log("Available ports:", ports);

    const picoPortInfo = ports.find(
      (p) => p.vendorId === "2e8a" // Raspberry Pi Pico vendor ID
      // optionally also check productId
    );

    if (!picoPortInfo) {
      console.error("❌ Pico not found");
      return;
    }

    port = new SerialPort({
      /* path: "/dev/ttyACM0", */
      path: picoPortInfo.path,
      baudRate: 9600,
      /* autoOpen: false, */
    });

    // Parser for received data
    parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

    //Open Port
    port.open((err) => {
      if (err) {
        console.error("Failed to open serial port:", err);
        port = null;
      } else {
        console.log("✅ Serial port opened successfully");
        resetMotors();

        // Listener for data from Pico
        parser.on("data", (data) => {
          console.log(`Received from Pico: ${data}`);
        });
      }
    });

    port.on("error", (err) => {
      console.error("Serial port error:", err);
    });
  } catch (err) {
    console.error("Failed to initialize serial port:", err);
  }
}

function sendToPico(value, mode) {
  if (!port || !port.isOpen) {
    console.warn("Serial port not open — cannot send");
    return;
  }

  const message = `${value}\n`;
  port.write(message, (err) => {
    if (err) console.error("Serial write failed:", err.message);
    /* else console.log(`Sent to Pico [mode: ${mode}] → ${value}`); */
  });
}
//reset Motors after every mode chnage
function resetMotors() {
  console.log("Resetting motors to 0...");
  sendToPico(0, currentMode);
}

// Data Storage
let participationId = null;
let calibrationValue = null;
let currentMode = "unknown";

//Data Storage
let allSessions = [];
let currentSession = createEmptySession();

function createEmptySession() {
  return {
    mode: null,
    startTime: null,
    stopTime: null,
    array: null,
    canvas: null,
    pleasant: null,
    focus: null,
    realism: null,
  };
}

function safeSession() {
  if (currentSession.mode !== null) {
    const sessionArray = [
      currentSession.mode,
      currentSession.startTime,
      currentSession.stopTime,
      currentSession.array,
      currentSession.canvas,
      currentSession.pleasant,
      currentSession.focus,
      currentSession.realism,
    ];
    allSessions.push(sessionArray);
    console.log(`Session saved:`, sessionArray);
    console.log(`Total sessions: ${allSessions.length}`);
    currentSession = createEmptySession();
  }
}

function safeAllSession() {
  const filePath = path.join(dataDir, "sessions.txt");

  // Build content
  let content = "";
  content += `Participation ID: ${participationId || "N/A"}\n`;
  content += `Calibration Value: ${calibrationValue || "N/A"}\n\n`;

  content += "Sessions:\n";
  allSessions.forEach((session, idx) => {
    content += `Session ${idx + 1}: ${JSON.stringify(session)}\n`;
  });

  // Write to file
  fs.writeFileSync(filePath, content, "utf8");
  console.log(`All sessions saved to ${filePath}`);
}

// Express Routes
server.get("/", (req, res) => {
  res.send("Express server is up and running!");
});
//cal Val handler
server.get("/save/calibrationMain/:currentCalVal", (req, res) => {
  const currentCalVal = req.params.currentCalVal;
  console.log(`Received Cal Value: ${currentCalVal} `);

  sendToPico(currentCalVal, "calVal");

  res.send("Cal Value received and sent");
});

server.get("/save/participationId/:id", (req, res) => {
  res.send("ParticipationId was send!");
  console.log(req.params.id);
  participationId = req.params.id;
});

server.get("/save/calibrationValue/:calVal", (req, res) => {
  res.send("calibrationValue was send!");
  console.log(req.params.calVal);
  calibrationValue = req.params.calVal;
});
server.get("/save/index/:index", (req, res) => {
  res.send("index was send!");
  console.log(req.params.index);
  currentSession.index = req.params.index;
});

server.get("/save/startTime/:start", (req, res) => {
  res.send("startTime was send!");
  console.log(req.params.start);
  currentSession.startTime = req.params.start;
});
server.get("/save/stopTime/:stop", (req, res) => {
  res.send("stopTime was send!");
  console.log(req.params.stop);
  currentSession.stopTime = req.params.stop;
});
server.get("/save/array/:array", (req, res) => {
  res.send("ConditionArray was send!");
  console.log(req.params.array);
  currentSession.array = req.params.array;
});
server.get("/save/mode/:mode", (req, res) => {
  const newMode = req.params.mode;
  currentMode = newMode;
  currentSession.mode = newMode;
  console.log(`Mode changed → ${currentMode}`);
  res.send("Mode updated");
  resetMotors();
});
server.get("/save/canvas/:selectedCanvas", (req, res) => {
  res.send("selectedCanvas was send!");
  console.log(req.params.selectedCanvas);
  currentSession.canvas = req.params.selectedCanvas;
});
server.get("/save/intensity/:pleasant", (req, res) => {
  res.send("Pleasant was send!");
  currentSession.pleasant = req.params.pleasant;
  console.log(req.params.pleasant);
});
server.get("/save/height/:focus", (req, res) => {
  res.send("Focus was send!");
  currentSession.focus = req.params.focus;
  console.log(req.params.focus);
});
server.get("/save/height/:realism", (req, res) => {
  res.send("Realism was send!");
  currentSession.realism = req.params.realism;
  console.log(req.params.realism);
});
server.get("/save/session", (req, res) => {
  safeSession();
  res.send("Session saved!");
});

// Pico value handler
server.get("/save/main/:value", (req, res) => {
  const picoValue = req.params.value;
  console.log(`Received Pico Value: ${picoValue} [mode: ${currentMode}]`);

  sendToPico(picoValue, currentMode);

  res.send("Pico Value received and sent");
});

// Shutdown
process.on("SIGINT", () => {
  console.log("Shutting down server...");
  safeAllSession();

  if (port && port.isOpen) {
    port.close(() => {
      console.log("Serial port closed");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// Start Server on Port 3000
server.listen(3000, () => {
  console.log("Server running at http://localhost:3000/");
  initializeSerial();
});
