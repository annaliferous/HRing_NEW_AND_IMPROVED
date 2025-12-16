// Initial SetUp
const calibrationSection = document.getElementById("calibration");
const screenSection = document.getElementById("screen");
const questionnaireSection = document.getElementById("questionnaire");

const calibrationSlider = document.getElementById("calibration_slider");
const screenSlider = document.getElementById("screen_slider");
const participationIdInput = document.getElementById("participation_id");
const calibrationOutput = document.getElementById("demo");

const url = "http://localhost:3000/save/";

let startTime, stopTime;
let calibrationValue = 0;
let participationId = 0;
let participation_id_matrix = 0;
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

// Data Function to send data in the CORRECT order, with Promises
function fetchData(endpoint) {
  return new Promise((resolve, reject) => {
    fetch(endpoint)
      .then((response) => {
        resolve(response);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

// Calibration
calibrationSlider.addEventListener("input", () => {
  calibrationOutput.textContent = calibrationSlider.value;
  let currentCalVal = calibrationSlider.value;
  let sendCurrentCalVal = url + "calibrationMain/" + currentCalVal;
  console.log(`Current CalVal "${currentCalVal}"`);
  fetch(sendCurrentCalVal).catch((err) => console.error("Fetch error:", err));
});
document.getElementById("calibration_send").addEventListener("click", () => {
  if (!participationIdInput.value) {
    alert("Please enter a Participation ID!");
    return;
  }
  calibrationValue = parseInt(calibrationSlider.value);
  participationId = parseInt(participationIdInput.value);

  // Setup condition matrix for this participant
  setupConditionMatrix(participationId);
  // Send calibrationValue + participantId
  /* fetch(url + "participationId/" + participation_id);
  fetch(url + "calibrationValue/" + calibrationValue);

  choosePath();

  calibrationSection.style.display = "none";
  screenSection.style.display = "block"; */
  fetchData(url + "participationId/" + participationId)
    .then(() => fetchData(url + "calibrationValue/" + calibrationValue))
    .then(() => choosePath())
    .then(() => {
      calibrationSection.style.display = "none";
      screenSection.style.display = "block";
    })
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
        intensity_slider.value = 0;
        height_slider.value = 0;
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
const conditionMatrix = [
  [0, "up", 25, 100],
  [1, "up", 50, 100],
  [2, "up", 75, 100],
  [3, "up", 100, 100],
  [4, "down", 25, 100],
  [5, "down", 50, 100],
  [6, "down", 75, 100],
  [7, "down", 100, 100],
  [8, "olymp", 25, 100],
  [9, "olymp", 50, 100],
  [10, "olymp", 75, 100],
  [11, "olymp", 100, 100],
  [12, "tartarus", 25, 100],
  [13, "tartarus", 50, 100],
  [14, "tartarus", 75, 100],
  [15, "tartarus", 100, 100],
];

function setupConditionMatrix(participantId) {
  shuffledConditionMatrix = shuffleArray(conditionMatrix, participantId);
}

function choosePath() {
  if (currentModeIndex >= shuffledConditionMatrix.length) {
    console.warn("choosePath() ignored — experiment finished.");
    return;
  }

  /* const currentMode = modeMatrix[participation_id_matrix][currentModeIndex]; */
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
  /*  currentModeIndex++;
  //Der Index wird zu früh erhöht!!!!!!!!
  // Fix!!!!!!!
  arrayLoop = 4;
  if (currentModeIndex >= shuffledConditionMatrix.length) {
    if (arrayLoop > 0) {
      currentModeIndex = 0;
      /* choosePath(); */
  /*
    }
    alert("Thank you for your participations!.");
    console.log("Script stopped after 64 runs.");
    return;
  } */
  /* choosePath(); */
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
    `🧮 Index: ${currentIndex} | Mode: ${currentMode} | Max Pico: ${max_pico_value} | Min Pico: ${min_pico_value}`
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
  "canvas_section_container"
);

const intensity_send = document.getElementById("intensity_send");
const intensity_return = document.getElementById("intensity_return");

const height_send = document.getElementById("height_send");
const height_return = document.getElementById("height_return");

const intensity_container = document.getElementById("intensity_container");
const height_container = document.getElementById("height_container");

function buttonFunctions(canvas) {
  intensity_container.scrollIntoView({ behavior: "smooth" });
  selectedCanvas = canvas;
  console.log(selectedCanvas);
}

intensity_send.addEventListener("click", () => {
  height_container.scrollIntoView({ behavior: "smooth" });
});
intensity_return.addEventListener("click", () => {
  canvas_section_container.scrollIntoView({ behavior: "smooth" });
});

height_return.addEventListener("click", () => {
  intensity_container.scrollIntoView({ behavior: "smooth" });
});

//Send [canvas, intensity, height]
const intensity_slider = document.getElementById("intensity_slider");
const height_slider = document.getElementById("height_slider");

height_send.addEventListener("click", () => {
  let intensity = intensity_slider.value;
  let height = height_slider.value;

  // Send questionnaire data to backend
  fetchData(url + "canvas/" + selectedCanvas)
    .then(() => fetchData(url + "intensity/" + intensity))
    .then(() => fetchData(url + "height/" + height))
    .then(() => fetchData(url + "session"))
    .then(() => {
      nextMode();
    })

    .catch((err) => {
      console.error("Error sending questionnaire data:", err);
    });
});
