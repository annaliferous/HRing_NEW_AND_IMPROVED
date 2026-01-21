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
let shuffledConditionMatrix = [];
let currentModeIndex = 0;

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

  sendCalibrationValue(calibrationValue)
    .then(() => choosePath())
    .catch((err) => {
      console.error("Error in calibration setup:", err);
    });
});

// Screen Slider
screenSlider.addEventListener("mousedown", () => {
  startTime = Date.now();
  /* fetch(url + "startTime/" + startTime); */
  fetchData(url + "startTime/" + startTime);
});

screenSlider.addEventListener("mouseup", () => {
  let mouseUpPromise = new Promise((resolve, reject) => {
    if (screenSlider.value >= 99) {
      resolve();
    } else {
      reject();
    }
  });
  mouseUpPromise
    .then(() => {
      choosePath();
    })
    .then(() => {
      stopTime = Date.now();
      fetch(url + "stopTime/" + stopTime);

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
  if (currentModeIndex >= shuffledConditionMatrix.length) {
    console.warn("Slider input ignored — experiment finished.");
    return;
  }
  const picoValue = realTimeCalculation();

  const currentCondition = shuffledConditionMatrix[currentModeIndex];
  const currentMode = currentCondition[1]; // "up", "down", "olymp", "tartarus"

  const endpoint = url + "main/" + picoValue;
  console.log(`Mode "${currentMode}" → PicoValue: ${picoValue}`);
  fetch(endpoint).catch((err) => console.error("Fetch error:", err));
});

function choosePath() {
  if (currentModeIndex >= shuffledConditionMatrix.length) {
    console.warn("choosePath() ignored — experiment finished.");
    return;
  }

  const currentCondition = shuffledConditionMatrix[currentModeIndex];
  fetchData(url + "array/" + currentCondition);
  const currentMode = currentCondition[1]; // "up", "down", "olymp", "tartarus"
  console.log(`Starting mode: ${currentMode}`);
  fetchData(url + "mode/" + currentMode);
}

function nextMode() {
  if (currentModeIndex < shuffledConditionMatrix.length - 1) {
    currentModeIndex++;
    choosePath();
    screenSection.style.display = "block";
    questionnaireSection.style.display = "none";
  } else {
    alert("Experiment finished. Thank you!");
    calibrationSection.style.display = "none";
    screenSection.style.display = "none";
    questionnaireSection.style.display = "none";
  }
}

// ===== CALCULATION =====
function realTimeCalculation() {
  const sliderValue = parseInt(screenSlider.value);
  const currentCondition = shuffledConditionMatrix[currentModeIndex];
  const currentIndex = currentCondition[0];
  const min_pico_value = Number(currentCondition[2]) + Number(calibrationValue);
  const max_pico_value = Number(currentCondition[3]) + Number(calibrationValue);

  let actualPicoValue =
    min_pico_value + (sliderValue / 100) * (max_pico_value - min_pico_value);

  const currentMode = currentCondition[1]; // "up", "down", "olymp", or "tartarus"
  console.log(
    `🧮 Index: ${currentIndex} | Mode: ${currentMode} | Max Pico: ${max_pico_value} | Min Pico: ${min_pico_value}`,
  );

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
  console.log(selectedCanvas);
}

pleasant_send.addEventListener("click", () => {
  focus_container.scrollIntoView({ behavior: "smooth" });
});
pleasant_return.addEventListener("click", () => {
  canvas_section_container.scrollIntoView({ behavior: "smooth" });
});

focus_send.addEventListener("click", () => {
  realism_container.scrollIntoView({ behavior: "smooth" });
});
focus_return.addEventListener("click", () => {
  pleasant_container.scrollIntoView({ behavior: "smooth" });
});

realism_return.addEventListener("click", () => {
  focus_container.scrollIntoView({ behavior: "smooth" });
});

realism_send.addEventListener("click", () => {
  let pleasant = pleasant_slider.value;
  let focus = focus_slider.value;
  let realism = realism_slider.value;

  // Send questionnaire data to backend
  fetchData(url + "canvas/" + selectedCanvas)
    .then(() => fetchData(url + "pleasant/" + pleasant))
    .then(() => fetchData(url + "focus/" + focus))
    .then(() => fetchData(url + "realism/" + realism))
    .then(() => fetchData(url + "session"))
    .then(() => {
      nextMode();
    })

    .catch((err) => {
      console.error("Error sending questionnaire data:", err);
    });
});
