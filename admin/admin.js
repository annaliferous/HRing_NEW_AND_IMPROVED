// Dropdown Menu
function myFunction() {
  document.getElementById("myDropdown").classList.toggle("show");
}

window.onclick = function (event) {
  if (!event.target.matches(".dropbtn")) {
    const dropdowns = document.getElementsByClassName("dropdown-content");
    for (let i = 0; i < dropdowns.length; i++) {
      const openDropdown = dropdowns[i];
      if (openDropdown.classList.contains("show")) {
        openDropdown.classList.remove("show");
      }
    }
  }
};

// Table
// Initial data
//Random Seed creation
let shuffledDataArray = [];

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
  const shuffled = shuffleArray(dataArray, participantId);

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
          row // insert after clicked row
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
//shuffle Button
document.getElementById("shuffle-data").addEventListener("click", () => {
  table.setData(setupDataArray(1));
});

// !!!!!!! Participant View !!!!!!!!
/* Calibration 
while subject is calibration: Wait screen */
let img = document.createElement("img");
img.src = "assets/hourglass.gif";
img.width = 50;
img.height = 50;
document.getElementById("hourglass").appendChild(img);

/*Study Slider 
display PartID and Calibration Value*/
