import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, registerUser } from "./helpers.js";

describe("Homework subtasks", () => {
  it("creates, reorders (via sortOrder on creation), toggles, and deletes subtasks", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };

    const hwRes = await request(app)
      .post("/api/homework")
      .set(headers)
      .send({ title: "Matheaufgaben" });
    const homeworkId = hwRes.body.id as string;
    expect(hwRes.body.subtasks).toEqual([]);

    const sub1 = await request(app)
      .post(`/api/homework/${homeworkId}/subtasks`)
      .set(headers)
      .send({ title: "Aufgabe 1" });
    expect(sub1.status).toBe(201);
    expect(sub1.body).toMatchObject({ title: "Aufgabe 1", done: false, sortOrder: 0 });

    const sub2 = await request(app)
      .post(`/api/homework/${homeworkId}/subtasks`)
      .set(headers)
      .send({ title: "Aufgabe 2" });
    expect(sub2.body.sortOrder).toBe(1);

    const toggleRes = await request(app)
      .patch(`/api/homework/subtasks/${sub1.body.id}`)
      .set(headers)
      .send({ done: true });
    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.done).toBe(true);

    const renameRes = await request(app)
      .patch(`/api/homework/subtasks/${sub2.body.id}`)
      .set(headers)
      .send({ title: "Aufgabe 2 (überarbeitet)" });
    expect(renameRes.body.title).toBe("Aufgabe 2 (überarbeitet)");

    const listRes = await request(app).get("/api/homework").set(headers);
    expect(listRes.body[0].subtasks).toHaveLength(2);

    const deleteRes = await request(app)
      .delete(`/api/homework/subtasks/${sub1.body.id}`)
      .set(headers);
    expect(deleteRes.status).toBe(204);

    const listAfterDelete = await request(app).get("/api/homework").set(headers);
    expect(listAfterDelete.body[0].subtasks).toHaveLength(1);
  });

  it("prevents user B from adding/editing/deleting subtasks on user A's homework", async () => {
    const userA = await registerUser();
    const userB = await registerUser();
    const aHeaders = { Authorization: `Bearer ${userA.accessToken}` };
    const bHeaders = { Authorization: `Bearer ${userB.accessToken}` };

    const hwRes = await request(app)
      .post("/api/homework")
      .set(aHeaders)
      .send({ title: "Matheaufgaben" });
    const homeworkId = hwRes.body.id as string;

    expect(
      (
        await request(app)
          .post(`/api/homework/${homeworkId}/subtasks`)
          .set(bHeaders)
          .send({ title: "Fremde Aufgabe" })
      ).status,
    ).toBe(404);

    const subRes = await request(app)
      .post(`/api/homework/${homeworkId}/subtasks`)
      .set(aHeaders)
      .send({ title: "Aufgabe 1" });
    const subtaskId = subRes.body.id as string;

    expect(
      (
        await request(app)
          .patch(`/api/homework/subtasks/${subtaskId}`)
          .set(bHeaders)
          .send({ done: true })
      ).status,
    ).toBe(404);
    expect(
      (await request(app).delete(`/api/homework/subtasks/${subtaskId}`).set(bHeaders)).status,
    ).toBe(404);
  });
});
