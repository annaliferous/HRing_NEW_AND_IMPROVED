const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const cors = require("cors");
const qs = require("qs");
const fs = require("fs");
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

app.set("query parser", (str) => qs.parse(str, {}));
app.use(cors());

app.use(express.static(path.join(__dirname, "public")));

/* admin gives okay to start Trial */

io.on("connection", (socket) => {
  /* console.log("Client connected:", socket.id); */

  /* Admin */
  socket.on("startTrial", () => {
    console.log("Trial started by admin");

    socket.broadcast.emit("trialStarted");
  });

  socket.on("sendTrial", (trial) => {
    console.log("Trial approved by admin:", trial);

    socket.broadcast.emit("trialData", trial);
  });

  /* Participant */
  socket.on("finishedCalibration", () => {
    console.log("Calibration finished!");

    socket.broadcast.emit("finishedCalibration");
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

    sendToPico(value, "slider");
  });

  socket.on("startTime", (timestamp) => {
    console.log("Participant started trial at:", timestamp);
  });

  socket.on("stopTime", (timestamp) => {
    console.log("Participant stopped trial at:", timestamp);
  });

  socket.on("trialCompleted", (data) => {
    console.log("Participant completed trial:", data);
    // Notify admin that participant is ready
    socket.broadcast.emit("participantReady", data);
  });

  socket.on("canvas", (canvas) => {
    console.log("Participant selected canvas:", canvas);
    socket.broadcast.emit("canvas", canvas);
  });

  // Pleasant slider update
  socket.on("pleasantUpdate", (value) => {
    console.log("Pleasant slider:", value);
    socket.broadcast.emit("pleasantUpdate", value);
  });

  // Focus slider update
  socket.on("focusUpdate", (value) => {
    console.log("Focus slider:", value);
    socket.broadcast.emit("focusUpdate", value);
  });

  // Realism slider update
  socket.on("realismUpdate", (value) => {
    console.log("Realism slider:", value);
    socket.broadcast.emit("realismUpdate", value);
  });

  // Participant finished questionnaire
  socket.on("finishedQuestionnaire", (data) => {
    console.log("Participant finished questionnaire:", data);
    socket.broadcast.emit("finishedQuestionnaire", data);
  });

  // Trial completed
  socket.on("trialCompleted", (data) => {
    console.log("Participant completed trial:", data);
    socket.broadcast.emit("participantReady", data);
  });

  socket.on("disconnect", () => {
    /* console.log("Client disconnected:", socket.id); */
  });
});

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

function sendToPico(value, mode) {
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
  sendToPico(0, currentMode);
}

// Pico value handler
app.get("/save/calibrationMain/:currentCalVal", (req, res) => {
  const currentCalVal = req.params.currentCalVal;
  console.log(`Received Cal Value: ${currentCalVal} `);

  sendToPico(currentCalVal, "calVal");

  res.send("Cal Value received and sent");
});
// Shutdown
process.on("SIGINT", () => {
  console.log("Shutting down server...");

  if (port && port.isOpen) {
    port.close(() => {
      console.log("Serial port closed");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

app.get("/participant", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "participant.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// Start Server on Port 3000
server.listen(3000, () => {
  console.log("Server running at http://localhost:3000/");
  initializeSerial();
});
