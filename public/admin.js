/* Pre-Study/Between-Study */
const socket = io();
const url = "http://localhost:3000/admin/";
let shuffled = [];
let currentShuffledIndex = 0;

let participationIdInput = document.getElementById("id");
let participantId = 0;
let calibrationValue = null;

function apply() {
  participantId = parseInt(participationIdInput.value);
}
/* Drawing Table */
const canvas = document.querySelector("canvas"),
  ctx = canvas.getContext("2d");

//global variabels wiht default values
let prevX,
  prevY,
  isDrawing = false,
  selectedColor = "#000";

function drawCenterLine() {
  ctx.save();
  ctx.setLineDash([10, 15]);
  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2);
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();
  ctx.restore();
}

const setCanvasBackground = () => {
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = selectedColor;
  drawCenterLine();
};

const getCanvasCoordinates = (e) => {
  const rect = canvas.getBoundingClientRect();
  return {
    /* extracts viewport coordinates from canvas position*/
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
};

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
  if (e.pressure === 0) return;
  if (e.clientX >= canvas.width) {
    canvas.releasePointerCapture(e.pointerId);
    ctx.closePath();
    ctx.restore();
    isDrawing = false;
    calculateValue(e);
  }
};

function clearCanvas() {
  setCanvasBackground();
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

//Sending and calculating the values

function calculateValue(e) {
  const rect = canvas.getBoundingClientRect();
  const y = e.clientY - rect.top;
  console.log("y:", y);

  let picoValue = 0;
  let roundedPicoValue = Math.round(picoValue);

  if (y <= canvas.height / 2) {
    picoValue = y * (-180 / (canvas.height / 2));
    roundedPicoValue = Math.round(picoValue);
    console.log("roundedPicoValue :", roundedPicoValue);
  } else {
    picoValue = (y - canvas.height / 2) * (180 / (canvas.height / 2));
    roundedPicoValue = Math.round(picoValue);
    console.log("roundedPicoValue :", roundedPicoValue);
  }
  fetch(url + roundedPicoValue).catch((err) =>
    console.error("Fetch error:", err),
  );
}

/* Table */
/* Initial data */
//Random Seed creation

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
const dataArray = [
  [1, "up", 25, 100],
  [2, "up", 50, 100],
  [3, "up", 75, 100],
  [4, "down", 0, 100],
  [5, "down", 25, 100],
  [6, "down", 50, 100],
  [7, "down", 75, 100],
  [8, "olymp", 0, 100],
  [9, "olymp", 25, 100],
  [10, "olymp", 50, 100],
  [11, "olymp", 75, 100],
  [12, "tartarus", 0, 100],
  [13, "tartarus", 25, 100],
  [14, "tartarus", 50, 100],
  [15, "tartarus", 75, 100],
];

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
document.getElementById("load-data").addEventListener("click", () => {
  const data = dataArray.map((row) => ({
    id: row[0],
    mode: row[1],
    min: row[2],
    max: row[3],
  }));
  table.setData(data);
});

document.getElementById("shuffle-data").addEventListener("click", () => {
  table.setData(setupDataArray(participantId));
});

/* Shuffle Matrix send */
function approveCurrentTrial() {
  if (currentShuffledIndex >= shuffled.length) {
    console.warn("No more trials");
    return;
  }

  const trial = shuffled[currentShuffledIndex];

  socket.emit("sendTrial", trial);
  currentShuffledIndex++;
}
async function startTrial() {
  socket.emit("startTrial");
  approveCurrentTrial();
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

/* Questionnaire */
/* Canvases */
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
