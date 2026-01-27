// Initial SetUp
const startSection = document.getElementById("startScreen");
const calibrationSection = document.getElementById("calibration");
const screenSection = document.getElementById("screen");
const questionnaireSection = document.getElementById("questionnaire");

const calibrationSlider = document.getElementById("calibration_slider");
const screenSlider = document.getElementById("screen_slider");
const calibrationOutput = document.getElementById("demo");

const pleasant_slider = document.getElementById("pleasant_slider");
const focus_slider = document.getElementById("focus_slider");
const realism_slider = document.getElementById("realism_slider");

const url = "http://localhost:3000/save/";

const socket = io();
/* start Trial! */
socket.once("trialStarted", () => {
  console.log("Trial started!");

  startSection.style.display = "none";
  calibrationSection.style.display = "block";
});

let startTime, stopTime;
let calibrationValue = 0;
let currentTrial = null;
let currentTrialIndex = 0;

// Slider Drag for touch (no lagging)
let isDragging = false;

function startDrag(e) {
  isDragging = true;
  updateSlider(e);
}
function endDrag() {
  isDragging = false;
}
function drag(e) {
  if (isDragging) updateSlider(e);
}
function updateSlider(e) {
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
}

[calibrationSlider, screenSlider].forEach((slider) => {
  slider.addEventListener("mousedown", startDrag);
  slider.addEventListener("touchstart", startDrag);
});
document.addEventListener("mousemove", drag);
document.addEventListener("mouseup", endDrag);
document.addEventListener("touchmove", drag);
document.addEventListener("touchend", endDrag);

// Calibration
calibrationSlider.addEventListener("input", () => {
  calibrationOutput.textContent = calibrationSlider.value;
  let currentCalVal = calibrationSlider.value;
  fetch(`${url}calibrationMain/${currentCalVal}`).catch((err) =>
    console.error("Live calibration error:", err),
  );
});

async function sendCalibrationValue(value) {
  const response = await fetch(`${url}calibrationValue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!response.ok)
    throw new Error(`Server responded with status ${response.status}`);
  return await response.json();
}

document.getElementById("calibration_send").addEventListener("click", () => {
  calibrationValue = parseInt(calibrationSlider.value);
  socket.emit("finishedCalibration");

  screenSection.style.display = "block";
  calibrationSection.style.display = "none";
});

// Screen Slider
/* Get Trial data */
socket.on("trialData", (trial) => {
  console.log("Received trial from admin:", trial);
  currentTrial = trial;

  screenSlider.value = 0;
  pleasant_slider.value = 50;
  focus_slider.value = 50;
  realism_slider.value = 50;

  screenSection.style.display = "block";
  questionnaireSection.style.display = "none";
  if (receivedDrawnPoints.length > 0) {
    sendCanvasAsSliderSequence();
  }
});
screenSlider.addEventListener("mousedown", () => {
  if (!currentTrial) {
    console.warn("No trial array data available");
    return;
  }

  startTime = Date.now();
  socket.emit("startTime", startTime);
});

screenSlider.addEventListener("mouseup", () => {
  if (!currentTrial) {
    console.warn("No trial array available");
    return;
  }

  let mouseUpPromise = new Promise((resolve, reject) => {
    if (screenSlider.value >= 99) {
      resolve();
    } else {
      reject();
    }
  });

  mouseUpPromise
    .then(() => {
      stopTime = Date.now();
      socket.emit("stopTime", stopTime);
      socket.emit("showQuestionnaire");

      setTimeout(() => {
        screenSlider.value = 0;
        pleasant_slider.value = 50;
        focus_slider.value = 50;
        realism_slider.value = 50;
        screenSection.style.display = "none";
        questionnaireSection.style.display = "block";
      }, 100);
    })
    .catch(() => {
      alert("Please start from the beginning");
      setTimeout(() => {
        screenSlider.value = 0;
      }, 0);
    });
});

screenSlider.addEventListener("input", () => {
  if (!currentTrial) {
    console.warn("Slider input ignored — no trial array.");
    return;
  }

  /* Value for Admin */

  socket.emit("sliderValue", screenSlider.value);
  /* Value for Pico */
  const picoValue = realTimeCalculation();
  fetch(`${url}main/${picoValue}`);
  socket.emit("picoValue", picoValue);
});
/* canvas */
let receivedDrawnPoints = [];

socket.on("points", (points) => {
  console.log("Participant received drawn points:", points);
  receivedDrawnPoints = points;
});
function convertDrawnPointsToSliderValues() {
  if (!receivedDrawnPoints || receivedDrawnPoints.length === 0) {
    alert("No canvas points received yet!");
    return [];
  }

  return receivedDrawnPoints.map((point) => {
    // point.x is already normalized 0–100 from admin
    const sliderValue = Math.round(point.x);
    return Math.max(0, Math.min(100, sliderValue));
  });
}

// ===== CALCULATION =====
function realTimeCalculation(sliderValueOverride = null) {
  if (!currentTrial) {
    console.warn("No current trial data");
    return 0;
  }

  const sliderValue =
    sliderValueOverride !== null
      ? parseInt(sliderValueOverride)
      : parseInt(screenSlider.value);
  const calibrationVal = calibrationValue || 0;
  const min_pico_value = Number(currentTrial.min) + calibrationVal;
  const max_pico_value = Number(currentTrial.max) + calibrationVal;
  const currentMode = currentTrial.mode;

  let actualPicoValue =
    min_pico_value + (sliderValue / 100) * (max_pico_value - min_pico_value);

  if (currentMode === "down") {
    actualPicoValue = max_pico_value - (actualPicoValue - min_pico_value);
  } else if (currentMode === "olymp") {
    if (sliderValue <= 50) {
      actualPicoValue =
        min_pico_value +
        (sliderValue / 100) * (max_pico_value - min_pico_value);
    } else {
      actualPicoValue = max_pico_value - (actualPicoValue - min_pico_value);
    }
  } else if (currentMode === "tartarus") {
    if (sliderValue > 50) {
      actualPicoValue =
        min_pico_value +
        (sliderValue / 100) * (max_pico_value - min_pico_value);
    } else {
      actualPicoValue = max_pico_value - (actualPicoValue - min_pico_value);
    }
  }

  return Math.round(actualPicoValue);
}
async function sendCanvasAsSliderSequence() {
  const sliderValues = convertDrawnPointsToSliderValues();
  if (sliderValues.length === 0) return;

  console.log("Streaming canvas as slider values:", sliderValues.length);

  const STEP_DELAY_MS = 30;

  for (const sliderValue of sliderValues) {
    const picoValue = realTimeCalculation(sliderValue);

    socket.emit("picoValue", picoValue);
    fetch(`${url}main/${picoValue}`).catch(console.error);

    await sleep(STEP_DELAY_MS);
  }

  console.log("Finished canvas playback.");
}

// Questionnaire
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

let selectedCanvas = null; // Variable to track the selected canvas

// Button Functions
// Enter Buttons

const canvas_section_container = document.getElementById(
  "canvas_section_container",
);

const pleasant_send = document.getElementById("pleasant_send");
const pleasant_return = document.getElementById("pleasant_return");
const pleasant_container = document.getElementById("pleasant_container");

const focus_send = document.getElementById("focus_send");
const focus_return = document.getElementById("focus_return");
const focus_container = document.getElementById("focus_container");

const realism_send = document.getElementById("realism_send");
const realism_return = document.getElementById("realism_return");
const realism_container = document.getElementById("realism_container");

function buttonFunctions(canvas) {
  pleasant_container.scrollIntoView({ behavior: "smooth" });
  selectedCanvas = canvas;
  socket.emit("canvas", selectedCanvas);
  console.log(selectedCanvas);
}

/* Pleasant Slider  Functionality*/
pleasant_slider.addEventListener("input", () => {
  socket.emit("pleasantUpdate", pleasant_slider.value);
});

pleasant_send.addEventListener("click", () => {
  focus_container.scrollIntoView({ behavior: "smooth" });
});

pleasant_return.addEventListener("click", () => {
  canvas_section_container.scrollIntoView({ behavior: "smooth" });
});
/* Focus Slider Functionality */

focus_slider.addEventListener("input", () => {
  socket.emit("focusUpdate", focus_slider.value);
});

focus_send.addEventListener("click", () => {
  realism_container.scrollIntoView({ behavior: "smooth" });
});

focus_return.addEventListener("click", () => {
  pleasant_container.scrollIntoView({ behavior: "smooth" });
});

/* Realism Slider Functionaloty */
realism_slider.addEventListener("input", () => {
  socket.emit("realismUpdate", realism_slider.value);
});

realism_return.addEventListener("click", () => {
  focus_container.scrollIntoView({ behavior: "smooth" });
});

realism_send.addEventListener("click", () => {
  let pleasant = pleasant_slider.value;
  let focus = focus_slider.value;
  let realism = realism_slider.value;

  socket.emit("finishedQuestionnaire", {
    canvas: selectedCanvas,
    pleasant: pleasant,
    focus: focus,
    realism: realism,
    trialId: currentTrial?.id,
    timestamp: Date.now(),
  });
  showWaitingScreen();

  // Send questionnaire data to backend
  /* fetchData(url + "canvas/" + selectedCanvas)
    .then(() => fetchData(url + "pleasant/" + pleasant))
    .then(() => fetchData(url + "focus/" + focus))
    .then(() => fetchData(url + "realism/" + realism))
    .then(() => fetchData(url + "session"))
    .then(() => {
      questionnaireSection.style.display = "none";
      showWaitingScreen();
    })

    .catch((err) => {
      console.error("Error sending questionnaire data:", err);
    }); */
});

async function fetchData(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response;
}

function showWaitingScreen() {
  const waitingSection = document.getElementById("waitingScreen");
  if (waitingSection) {
    questionnaireSection.style.display = "none";
    waitingSection.style.display = "block";
  }
  console.log("Waiting for admin approval...");
}

socket.on("trialData", (trial) => {
  const waitingSection = document.getElementById("waitingScreen");
  if (waitingSection) {
    waitingSection.style.display = "none";
  }
});

/* Waiting Screen */
document.addEventListener("DOMContentLoaded", () => {
  let waitingImg = document.createElement("img");
  waitingImg.src = "assets/hourglass.gif";
  waitingImg.width = 50;
  waitingImg.height = 50;
  const waitingHourglassEl = document.getElementById("waiting-hourglass");
  if (waitingHourglassEl) {
    waitingHourglassEl.appendChild(waitingImg);
  }
});
