/**
 * @jest-environment jsdom
 */

let mockSocket;

document.body.innerHTML = `
<section id="startScreen"></section>
<section id="calibration"></section>
<section id="screen"></section>
<section id="questionnaire"></section>

<input id="calibration_slider" type="range" value="0"/>
<input id="screen_slider" type="range" value="0"/>
<span id="demo"></span>

<input id="pleasant_slider" type="range" value="50"/>
<input id="focus_slider" type="range" value="50"/>
<input id="realism_slider" type="range" value="50"/>

<button id="calibration_send"></button>

<div id="canvas_section_container"></div>

<button id="pleasant_send"></button>
<button id="pleasant_return"></button>
<div id="pleasant_container"></div>

<button id="focus_send"></button>
<button id="focus_return"></button>
<div id="focus_container"></div>

<button id="realism_send"></button>
<button id="realism_return"></button>
<div id="realism_container"></div>

<div id="hourglass"></div>
<div id="waitingScreen"></div>
<div id="waiting-hourglass"></div>
`;

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  }),
);

global.alert = jest.fn();
global.console.warn = jest.fn();

global.io = () => {
  mockSocket = {
    emit: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
  };
  return mockSocket;
};

HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  clearRect: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
}));

const {
  realTimeCalculation,
  convertDrawnPointsToSliderValues,
  __setState,
} = require("../public/participant.js");

describe("realTimeCalculation()", () => {
  beforeEach(() => {
    __setState({
      currentTrial: { min: 0, max: 100, mode: "up" },
      calibrationValue: 0,
    });
  });

  test("calculates up mode correctly", () => {
    expect(realTimeCalculation(50)).toBe(50);
  });

  test("calculates down mode correctly", () => {
    __setState({
      currentTrial: { min: 0, max: 100, mode: "down" },
    });
    expect(realTimeCalculation(0)).toBe(100);
  });

  test("calculates olymp mode correctly", () => {
    __setState({
      currentTrial: { min: 0, max: 100, mode: "olymp" },
    });
    expect(realTimeCalculation(25)).toBe(25);
    expect(realTimeCalculation(75)).toBe(25);
  });

  test("calculates tartarus mode correctly", () => {
    __setState({
      currentTrial: { min: 0, max: 100, mode: "tartarus" },
    });
    expect(realTimeCalculation(25)).toBe(75);
  });
});

describe("Questionnaire emit", () => {
  test("emits finishedQuestionnaire", () => {
    __setState({
      currentTrial: { id: 7 },
      selectedCanvas: "rise",
    });

    document.getElementById("pleasant_slider").value = 80;
    document.getElementById("focus_slider").value = 60;
    document.getElementById("realism_slider").value = 40;

    document.getElementById("realism_send").click();

    expect(mockSocket.emit).toHaveBeenCalledWith(
      "finishedQuestionnaire",
      expect.objectContaining({
        canvas: "rise",
        pleasant: "80",
        focus: "60",
        realism: "40",
        trialId: 7,
      }),
    );
  });

  describe("Calibration send button", () => {
    test("emits finishedCalibration", () => {
      document.getElementById("calibration_slider").value = 33;
      document.getElementById("calibration_send").click();

      expect(mockSocket.emit).toHaveBeenCalledWith("finishedCalibration", 33);
    });
  });
});
