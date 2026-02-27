/* test post and get rquests for db*/

const request = require("supertest");
/* make http requests without listening to a real port */
const { app, server, db } = require("../server");
/* simulate client side */

afterAll((done) => {
  server.close();
  db.close();
  done();
});

describe("GET /db/start-trials", () => {
  it("returns 16 trials", async () => {
    const res = await request(app).get("/db/start-trials");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(16);
    expect(res.body[0]).toHaveProperty("mode");
  });
});

describe("POST /db/participant", () => {
  it("creates a participant and returns an id", async () => {
    const res = await request(app)
      .post("/db/participant")
      .send({ participantCode: "P001" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
  });

  it("error when participantID is missing", async () => {
    const res = await request(app).post("/db/participant").send({});
    expect(res.status).toBe(400);
  });
});

jest.mock("serialport", () => ({
  SerialPort: { list: jest.fn().mockResolvedValue([]) },
}));
