/* Pre-Study/Between-Study */
const socket = io();

let shuffled = [];
let currentShuffledIndex = 0;

let participationIdInput = document.getElementById("id");
let participantId = null;
let dataFormat = null; // "table" or "canvas"

/* function apply(format) {
  dataFormat = format;

  if (format === "table") {
    participantId = parseInt(participationIdInput.value);
    console.log("Applied table data");
  }

  if (format === "canvas") {
    convertDrawnPointsToArray();
    console.log("Applied canvas data");
  }
} */

async function apply(format) {
  participantId = participationIdInput.value.trim();
  console.log("participantId:", participantId);

  if (!participantId) {
    alert("Enter Participant ID");
    return;
  }

  // Create participant row in DB, store the auto-increment id
  const res = await fetch("/db/participant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ participantId }),
  });

  if (!res.ok) {
    const err = await res.json();
    console.error("Server error:", err);
    alert("Failed to create participant");
    return;
  }

  const data = await res.json();
  window.currentParticipantDbId = data.dbId;

  dataFormat = format;
  console.log(`Participant "${participantId}" created with DB id ${data.id}`);
}

/* Drawing Table */
const canvas = document.querySelector("canvas"),
  ctx = canvas.getContext("2d");

//global variabels wiht default values
let prevX,
  prevY,
  isDrawing = false,
  selectedColor = "#000",
  drawnPoints = [];

const X_RANGE = 100; // 0-100
const Y_RANGE = 120; // 0-120 (degrees)

const setCanvasBackground = () => {
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = selectedColor;
  drawGrid();
};
function drawGrid() {
  ctx.save();
  ctx.strokeStyle = "#ddd";
  ctx.lineWidth = 1;

  // Vertical lines (every 10 x-units)
  for (let i = 0; i <= 10; i++) {
    const x = (i / 10) * canvas.width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  // Horizontal lines (every 12 y-units ≈ 10 degrees)
  for (let i = 0; i <= 10; i++) {
    const y = (i / 10) * canvas.height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Draw axis labels
  ctx.fillStyle = "#666";
  ctx.font = "12px Arial";
  ctx.fillText("0", 5, canvas.height - 5);
  ctx.fillText("100", canvas.width - 30, canvas.height - 5);
  ctx.fillText("120°", 5, 15);
  ctx.fillText("0°", 5, canvas.height - 20);

  ctx.restore();
}

const getCanvasCoordinates = (e) => {
  const rect = canvas.getBoundingClientRect();
  return {
    /* extracts viewport coordinates from canvas position*/
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
};
function calculateValue(e) {
  const coords = getCanvasCoordinates(e);

  drawnPoints.push({
    x: coords.x,
    y: coords.y,
    timestamp: Date.now(),
  });
}

const startDrawing = (e) => {
  if (e.pressure === 0) return;
  canvas.setPointerCapture(e.pointerId);
  isDrawing = true;
  ctx.save();
  ctx.setLineDash([]);
  ctx.beginPath();

  const coords = getCanvasCoordinates(e);
  ctx.moveTo(coords.x, coords.y);
  calculateValue(e);
};

const drawing = (e) => {
  if (!isDrawing || e.pressure === 0) return;
  const coords = getCanvasCoordinates(e);
  ctx.lineTo(coords.x, coords.y);
  ctx.stroke();
  calculateValue(e);
};

const stopDrawing = (e) => {
  /* f (e.pressure === 0) return; */
  if (!isDrawing) return;

  canvas.releasePointerCapture(e.pointerId);
  ctx.closePath();
  ctx.restore();
  isDrawing = false;
  calculateValue(e);
  console.log("Drawing stopped. Total points:", drawnPoints.length);
};

function clearCanvas() {
  setCanvasBackground();
  drawnPoints = [];
}

function saveCanvas() {
  const link = document.createElement("a");
  link.download = `${Date.now()}`.jpg;
  link.href = canvas.toDataURL();
  link.click();
}
/* canvas.addEventListener("touchstart", startDrawing);
canvas.addEventListener("touchmove", drawing);
canvas.addEventListener("touchend", stopDrawing); */

window.addEventListener("load", () => {
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  setCanvasBackground();
});

canvas.addEventListener("pointerdown", startDrawing);
canvas.addEventListener("pointermove", drawing);
canvas.addEventListener("pointerup", stopDrawing);
canvas.addEventListener("pointercancel", stopDrawing);

function convertDrawnPointsToArray() {
  if (drawnPoints.length === 0) {
    alert("No points drawn yet!");
    return [];
  }

  const normalizedData = drawnPoints.map((point, index) => {
    const xNormalized = Math.round((point.x / canvas.width) * X_RANGE);
    const yNormalized = Math.round(
      ((canvas.height - point.y) / canvas.height) * Y_RANGE,
    );

    return {
      id: index + 1,
      x: Math.max(0, Math.min(X_RANGE, xNormalized)),
      y: Math.max(0, Math.min(Y_RANGE, yNormalized)),
      timestamp: point.timestamp || Date.now(),
    };
  });

  return normalizedData;
}

//Sending and calculating the values

/* Table */
/* Initial data */
/* Random Seed creation */

function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function shuffleArray(array, seed) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function setupDataArray(participantId) {
  shuffled = shuffleArray(dataArray, participantId);

  return shuffled.map((row) => ({
    id: row[0],
    mode: row[1],
    min: row[2],
    max: row[3],
  }));
}

let startID = 1;
let tableData = [
  {
    id: startID,
    mode: "",
    /*     intensity: "", */
    min: "",
    max: "",
  },
];

/* make DB data ready for tabulator */
async function loadTrialsFromDB() {
  if (!currentParticipant) {
    alert("No participant selected");
    return;
  }

  participantId = participationIdInput.value;
  const rows = await res.json();

  /* Convert DB rows to Tabulator format */
  tableData = rows.map((r) => ({
    id: r.trialIndex,
    mode: r.mode,
    min: r.min,
    max: r.max,
  }));

  // Track max ID for "+"
  startID = Math.max(...tableData.map((r) => r.id), 0);

  // Load into table
  table.setData(tableData);
}

// Create Tabulator
const table = new Tabulator("#table", {
  data: tableData,
  movableRows: true,
  movableRowsHandle: false,
  layout: "fitColumns",

  columns: [
    {
      title: "ID",
      field: "id",
      width: "10%",
    },
    {
      title: "Mode",
      field: "mode",
      width: "40%",
      editor: "input",
    },
    {
      title: "Min Value",
      field: "min",
      width: "10%",
      editor: "input",
    },
    {
      title: "Max Value",
      field: "max",
      width: "10%",
      editor: "input",
    },
    {
      title: "",
      width: 40,
      hozAlign: "center",
      headerSort: false,
      formatter: function () {
        return '<i class="fa fa-plus" aria-hidden="true"></i>';
      },
      cellClick: function (e, cell) {
        const table = cell.getTable();
        const row = cell.getRow();
        startID += 1;

        table.addRow(
          {
            id: startID,
            mode: "",
            min: "",
            max: "",
          },
          false,
          row, // insert after clicked row
        );
      },
    },
    {
      title: "",
      width: 40,
      hozAlign: "center",
      headerSort: false,
      formatter: function (cell) {
        return '<i class="fa fa-minus" aria-hidden="true"></i>';
      },
      cellClick: function (e, cell) {
        const table = cell.getTable();

        if (table.getData().length > 1) {
          cell.getRow().delete();
        }
      },
    },

    {
      formatter: "handle",
      width: 30,
      align: "center",
      headerSort: false,
    },
  ],
});

//load Button
/* document.getElementById("load-data").addEventListener("click", () => {
  const data = dataArray.map((row) => ({
    id: row[0],
    mode: row[1],
    min: row[2],
    max: row[3],
  }));
  table.setData(data);
}); */
/* Load data received from server and DB */
document.getElementById("load-data").addEventListener("click", async () => {
  const res = await fetch("/db/start-trials");
  const data = await res.json();
  table.setData(data);
  shuffled = data;
  console.log("Loaded START_TRIALS:", data);
});

/* Load data already saved data from server and DB */
document.getElementById("load-saved").addEventListener("click", async () => {
  if (!window.currentParticipantDbId) {
    alert("Apply participant first");
    return;
  }

  const res = await fetch(`/db/trials/${window.currentParticipantDbId}`);
  const data = await res.json();
  table.setData(data);
  shuffled = data;
  console.log("Loaded saved trials:", data);
});

document.getElementById("shuffle-data").addEventListener("click", async () => {
  /* Ensure participant is registered first */
  if (!window.currentParticipantDbId) {
    await apply("table");
    if (!window.currentParticipantDbId) return; // apply failed
  }

  const seed = parseInt(participantId, 10) || Math.floor(Math.random() * 9999);

  let currentData = table.getData();

  if (!currentData.length) {
    const res = await fetch("/db/start-trials");
    currentData = await res.json();
  }

  const shuffledData = shuffleArray(currentData, seed);

  /* Re-assign sequential IDs after shuffle */
  shuffledData.forEach((row, i) => {
    row.id = i + 1;
  });

  shuffled = shuffledData;
  currentShuffledIndex = 0;

  table.setData(shuffled);
  console.log("Shuffled trials (seed=" + seed + "):", shuffled);
});

/* Shuffle Matrix send */

async function startTrial() {
  if (!window.currentParticipantDbId) {
    alert("Apply a participant first!");
    return;
  }

  if (dataFormat === "table") {
    const tableData = table.getData();

    if (!tableData.length) {
      alert("Table is empty – load or enter trial data first.");
      return;
    }
    const saveRes = await fetch("/db/trials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantId: window.currentParticipantDbId,
        trials: tableData,
      }),
    });

    if (!saveRes.ok) {
      alert("Failed to save trials to DB");
      return;
    }

    shuffled = tableData;
    currentShuffledIndex = 0;

    socket.emit("startTrial", {
      participantId: window.currentParticipantDbId,
      trials: shuffled,
    });

    console.log(
      "Trial started. Participant DB id:",
      window.currentParticipantDbId,
    );
  }

  if (dataFormat === "canvas") {
    const pointsArray = convertDrawnPointsToArray();

    if (!pointsArray.length) {
      alert("Please draw something first!");
      return;
    }

    socket.emit("drawnPoints", pointsArray);
    socket.emit("startTrial", {
      participantId: window.currentParticipantDbId,
      trials: [],
    });
  }

  document.getElementById("editing-section").style.display = "none";
  document.getElementById("calibration-screen").style.display = "block";
}

// !!!!!!! Participant View !!!!!!!!
/* Calibration 
while subject is calibration: Wait screen */
let img = document.createElement("img");
img.src = "assets/hourglass.gif";
img.width = 50;
img.height = 50;
document.getElementById("hourglass").appendChild(img);

socket.on("finishedCalibration", (value) => {
  calibrationValue = value;
  console.log("Calibration finished ADMIN");
  approveCurrentTrial();
  document.getElementById("calibration-screen").style.display = "none";
  document.getElementById("participant-slider").style.display = "block";
});

function debug() {
  document.getElementById("calibration-screen").style.display = "none";
  document.getElementById("participant-slider").style.display = "block";
}

function debug2() {
  document.getElementById("participant-slider").style.display = "none";
  document.getElementById("questionnaire-screen").style.display = "block";
}

/*Study Slider 
display PartID and Calibration Value*/
function updateParticipantSliderDisplay() {
  document.getElementById("display-participant-id").textContent =
    participantId || "-";

  document.getElementById("display-calibration-value").textContent =
    calibrationValue ?? "-";

  const currentTrial = shuffled[currentShuffledIndex];

  if (!currentTrial) return;

  document.getElementById("display-trial-id").textContent = currentTrial.id;
  document.getElementById("display-trial-mode").textContent = currentTrial.mode;
  document.getElementById("display-trial-min").textContent = currentTrial.min;
  document.getElementById("display-trial-max").textContent = currentTrial.max;
}

const participantSlider = document.getElementById("range23");
socket.on("sliderValue", (value) => {
  console.log("Particpant Slider Value received:", value);
  participantSlider.value = value;
  const display = document.getElementById("display-slider-value");
  if (display) display.textContent = value;
});

socket.on("showQuestionnaire", () => {
  document.getElementById("participant-slider").style.display = "none";
  document.getElementById("questionnaire-screen").style.display = "block";
});

/* Questionnaire - UI */
// Coordinates
const canvasData = {
  rise: { x1: 150, y1: 150, x2: 150, y2: 50, x3: 50, y3: 150 },
  fall: { x1: 50, y1: 150, x2: 50, y2: 50, x3: 150, y3: 150 },
  olymp: { x1: 20, y1: 150, x2: 100, y2: 50, x3: 180, y3: 150 },
  tartarus: {
    x1: 20,
    y1: 50,
    x2: 20,
    y2: 150,
    x3: 180,
    y3: 150,
    x4: 180,
    y4: 50,
    x5: 100,
    y5: 120,
  },
};
// Functions that draw the forms
function rise_and_fall(id, ctx) {
  const data = canvasData[id];
  ctx.clearRect(0, 0, 200, 200);
  ctx.beginPath();
  ctx.moveTo(data.x1, data.y1);
  ctx.lineTo(data.x2, data.y2);
  ctx.lineTo(data.x3, data.y3);
  ctx.closePath();
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(data.x2, data.y2);
  ctx.lineTo(data.x3, data.y3);
  ctx.strokeStyle = "white";
  ctx.stroke();
}

function olymp(id, ctx) {
  const data = canvasData[id];
  ctx.clearRect(0, 0, 200, 200);
  ctx.beginPath();
  ctx.moveTo(data.x1, data.y1);
  ctx.lineTo(data.x2, data.y2);
  ctx.lineTo(data.x3, data.y3);
  ctx.closePath();
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(data.x1, data.y1);
  ctx.lineTo(data.x2, data.y2);
  ctx.lineTo(data.x3, data.y3);
  ctx.strokeStyle = "white";
  ctx.stroke();
}

function tartarus(id, ctx) {
  const data = canvasData[id];
  ctx.clearRect(0, 0, 200, 200);
  ctx.beginPath();
  ctx.moveTo(data.x1, data.y1);
  ctx.lineTo(data.x2, data.y2);
  ctx.lineTo(data.x3, data.y3);
  ctx.lineTo(data.x4, data.y4);
  ctx.lineTo(data.x5, data.y5);
  ctx.closePath();
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(data.x1, data.y1);
  ctx.lineTo(data.x5, data.y5);
  ctx.lineTo(data.x4, data.y4);
  ctx.strokeStyle = "white";
  ctx.stroke();
}

document.addEventListener("DOMContentLoaded", () => {
  Object.keys(canvasData).forEach((id) => {
    const canvas = document.getElementById(`${id}Canvas`);
    const ctx = canvas.getContext("2d");
    switch (id) {
      case "olymp":
        olymp(id, ctx);
        break;
      case "tartarus":
        tartarus(id, ctx);
        break;
      default:
        rise_and_fall(id, ctx);
    }
  });
});

/* final approval screen */
function debug4() {
  approveCurrentTrial();
}

/* Questionnaire - Functionality */
socket.on("showQuestionnaire", () => {
  console.log("Participant showing questionnaire");
  document.getElementById("participant-slider").style.display = "none";
  document.getElementById("questionnaire-screen").style.display = "block";
});

// Update canvas selection in real-time
socket.on("canvas", (canvasName) => {
  console.log("Participant selected canvas:", canvasName);

  document.querySelectorAll(".canvas").forEach((c) => {
    c.parentElement.style.border = "";
  });
  const selectedCanvasEl = document.getElementById(`${canvasName}Canvas`);
  if (selectedCanvasEl) {
    selectedCanvasEl.parentElement.style.border = "3px solid blue";
  }
});

// Update pleasant slider in real-time
socket.on("pleasantUpdate", (value) => {
  const pleasantSlider = document.getElementById("pleasant");
  if (pleasantSlider) {
    pleasantSlider.value = value;
  }
});

// Update focus slider in real-time
socket.on("focusUpdate", (value) => {
  const focusSlider = document.getElementById("focus");
  if (focusSlider) {
    focusSlider.value = value;
  }
});

// Update realism slider in real-time
socket.on("realismUpdate", (value) => {
  const realismSlider = document.getElementById("realism");
  if (realismSlider) {
    realismSlider.value = value;
  }
});

// Participant finished questionnaire
socket.on("finishedQuestionnaire", () => {
  console.log("Participant finished questionnaire - showing approval screen");
  document.getElementById("questionnaire-screen").style.display = "none";
  document.getElementById("approve-section").style.display = "block";

  loadTrialDataForApproval();
});

function loadTrialDataForApproval() {
  if (currentShuffledIndex >= shuffled.length) {
    console.warn("All trials completed!");
    alert("All trials completed!");
    document.getElementById("approve-section").style.display = "none";
    document.getElementById("editing-section").style.display = "block";
    return;
  }

  const nextTrial = shuffled[currentShuffledIndex];

  // Populate trial edit fields
  document.getElementById("edit-trial-id").value = nextTrial.id;
  document.getElementById("edit-trial-mode").value = nextTrial.mode;
  document.getElementById("edit-trial-min").value = nextTrial.min;
  document.getElementById("edit-trial-max").value = nextTrial.max;

  // Update trial counter
  document.getElementById("trial-counter").textContent =
    `Trial ${currentShuffledIndex + 1} of ${shuffled.length}`;
}

/* Approval and Next Trial */
function approveCurrentTrial() {
  if (currentShuffledIndex >= shuffled.length) {
    console.warn("All trials completed!");
    alert("All trials completed!");
    document.getElementById("approve-section").style.display = "none";
    document.getElementById("editing-section").style.display = "block";
    resetViews();
    return;
  }
  const trial = {
    id: parseInt(document.getElementById("edit-trial-id").value),
    mode: document.getElementById("edit-trial-mode").value,
    min: parseInt(document.getElementById("edit-trial-min").value),
    max: parseInt(document.getElementById("edit-trial-max").value),
  };

  shuffled[currentShuffledIndex] = trial;

  console.log(
    `Sending trial ${currentShuffledIndex + 1}/${shuffled.length}:`,
    trial,
  );

  socket.emit("sendTrial", trial);
  currentShuffledIndex++;

  updateParticipantSliderDisplay();
  // Reset questionnaire view
  resetViews();

  document.getElementById("approve-section").style.display = "none";
  document.getElementById("participant-slider").style.display = "block";
}

function resetViews() {
  // Reset canvas highlights
  selectedCanvasName = null;
  document.querySelectorAll(".canvas").forEach((c) => {
    c.parentElement.style.border = "";
  });

  // Reset sliders to default
  const pleasantSlider = document.getElementById("pleasant");
  const focusSlider = document.getElementById("focus");
  const realismSlider = document.getElementById("realism");

  if (pleasantSlider) pleasantSlider.value = 50;
  if (focusSlider) focusSlider.value = 50;
  if (realismSlider) realismSlider.value = 50;

  // Reset approval screen displays
  const canvasDisplay = document.getElementById("selected-canvas-display");
  const pleasantDisplay = document.getElementById("pleasant-value-display");
  const focusDisplay = document.getElementById("focus-value-display");
  const realismDisplay = document.getElementById("realism-value-display");

  if (canvasDisplay) canvasDisplay.textContent = "-";
  if (pleasantDisplay) pleasantDisplay.textContent = "50";
  if (focusDisplay) focusDisplay.textContent = "50";
  if (realismDisplay) realismDisplay.textContent = "50";

  console.log("Questionnaire view reset");
}

/* Approval Functionality */

function skipTrial() {
  if (confirm("Are you sure you want to skip this trial?")) {
    console.log(`Skipping trial ${currentShuffledIndex + 1}`);
    currentShuffledIndex++;

    if (currentShuffledIndex >= shuffled.length) {
      alert("All trials completed!");
      document.getElementById("approve-section").style.display = "none";
      document.getElementById("editing-section").style.display = "block";
      resetQuestionnaireView();
    } else {
      // Load next trial for approval
      loadTrialDataForApproval();
    }
  }
}

function endStudy() {
  if (
    confirm(
      "Are you sure you want to end the study? This will stop all remaining trials.",
    )
  ) {
    console.log("Study ended by admin");
    currentShuffledIndex = shuffled.length; // Set to end
    document.getElementById("approve-section").style.display = "none";
    document.getElementById("editing-section").style.display = "block";
    resetQuestionnaireView();
    alert("Study ended. You can start a new study from the editing section.");
  }
}
