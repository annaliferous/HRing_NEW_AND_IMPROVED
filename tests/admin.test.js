/**
 * @jest-environment jsdom
 */

global.fetch = jest.fn();
global.alert = jest.fn();
global.confirm = jest.fn(() => true);

let mockSocket;

global.io = () => {
  mockSocket = {
    emit: jest.fn(),
    on: jest.fn(),
  };
  return mockSocket;
};

global.Tabulator = function () {
  return {
    getData: jest.fn(() => []),
    setData: jest.fn(),
    addRow: jest.fn(),
  };
};

document.body.innerHTML = `
<input id="id" value="123" />

<button id="load-data"></button>
<button id="load-saved"></button>
<button id="shuffle-data"></button>
<button id="startTrial"></button>

<div id="table"></div>

<div id="editing-section"></div>
<div id="calibration-screen"></div>
<div id="participant-slider"></div>
<div id="questionnaire-screen"></div>
<div id="approve-section"></div>
<div id="hourglass"></div>

<input id="edit-trial-id" value="1"/>
<input id="edit-trial-mode" value="up"/>
<input id="edit-trial-min" value="0"/>
<input id="edit-trial-max" value="100"/>

<span id="display-participant-id"></span>
<span id="display-calibration-value"></span>
<span id="display-trial-id"></span>
<span id="display-trial-mode"></span>
<span id="display-trial-min"></span>
<span id="display-trial-max"></span>

<!-- REQUIRED CANVAS -->
<canvas id="mainCanvas"></canvas>
`;

HTMLCanvasElement.prototype.getContext = () => ({
  fillRect: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  closePath: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  fillText: jest.fn(),
  setLineDash: jest.fn(),
});

HTMLCanvasElement.prototype.getBoundingClientRect = () => ({
  left: 0,
  top: 0,
});

require("../public/admin.js");

describe("Utility Functions", () => {
  test("seededRandom deterministic", () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    expect(a).toBe(b);
  });

  test("shuffleArray deterministic", () => {
    const arr = [1, 2, 3, 4];
    const a = shuffleArray(arr, 1);
    const b = shuffleArray(arr, 1);
    expect(a).toEqual(b);
  });

  test("shuffleArray keeps elements", () => {
    const arr = [1, 2, 3];
    const shuffled = shuffleArray(arr, 5);
    expect(shuffled.sort()).toEqual(arr.sort());
  });
});

describe("apply()", () => {
  test("alerts if no participant ID", async () => {
    document.getElementById("id").value = "";

    await apply("table");

    expect(alert).toHaveBeenCalledWith("Enter Participant ID");
  });

  test("calls fetch correctly", async () => {
    document.getElementById("id").value = "123";

    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ dbId: 5 }),
    });

    await apply("table");

    expect(fetch).toHaveBeenCalledWith(
      "/db/participant",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});

describe("approveCurrentTrial()", () => {
  test("emits trial and increments index", () => {
    shuffled = [{ id: 1, mode: "up", min: 0, max: 100 }];
    currentShuffledIndex = 0;

    approveCurrentTrial();

    expect(mockSocket.emit).toHaveBeenCalledWith("sendTrial", {
      id: 1,
      mode: "up",
      min: 0,
      max: 100,
    });

    expect(currentShuffledIndex).toBe(1);
  });
});
