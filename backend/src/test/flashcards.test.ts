import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, registerUser } from "./helpers.js";

async function setupTopic(headers: Record<string, string>) {
  const subjectRes = await request(app)
    .post("/api/subjects")
    .set(headers)
    .send({ name: "Mathe", color: "#3B82F6" });
  const subjectId = subjectRes.body.id as string;

  const sectionRes = await request(app)
    .post(`/api/subjects/${subjectId}/section-types`)
    .set(headers)
    .send({ name: "Regelheft" });
  const sectionTypeId = sectionRes.body.id as string;

  const topicRes = await request(app)
    .post(`/api/section-types/${sectionTypeId}/topics`)
    .set(headers)
    .send({ name: "Produktregel", gradeLevels: [11] });

  return { subjectId, sectionTypeId, topicId: topicRes.body.id as string };
}

describe("Flashcards", () => {
  it("creates, lists, updates, reviews, and deletes a flashcard", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };
    const { topicId } = await setupTopic(headers);

    const createRes = await request(app)
      .post(`/api/topics/${topicId}/flashcards`)
      .set(headers)
      .send({ question: "Wie lautet die Produktregel?", answer: "(u*v)' = u'v + uv'" });
    expect(createRes.status).toBe(201);
    expect(createRes.body.state).toBe("NEW");
    const flashcardId = createRes.body.id as string;

    const listRes = await request(app).get(`/api/topics/${topicId}/flashcards`).set(headers);
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);

    const updateRes = await request(app)
      .patch(`/api/flashcards/${flashcardId}`)
      .set(headers)
      .send({ answer: "sin(x) + x*cos(x)" });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.answer).toBe("sin(x) + x*cos(x)");

    const reviewAgainRes = await request(app)
      .patch(`/api/flashcards/${flashcardId}/review`)
      .set(headers)
      .send({ result: "again" });
    expect(reviewAgainRes.status).toBe(200);
    expect(reviewAgainRes.body.state).toBe("LEARNING");
    expect(reviewAgainRes.body.lastReviewedAt).not.toBeNull();

    const reviewKnownRes = await request(app)
      .patch(`/api/flashcards/${flashcardId}/review`)
      .set(headers)
      .send({ result: "known" });
    expect(reviewKnownRes.status).toBe(200);
    expect(reviewKnownRes.body.state).toBe("KNOWN");

    const deleteRes = await request(app)
      .delete(`/api/flashcards/${flashcardId}`)
      .set(headers);
    expect(deleteRes.status).toBe(204);

    const listAfterDelete = await request(app)
      .get(`/api/topics/${topicId}/flashcards`)
      .set(headers);
    expect(listAfterDelete.body).toHaveLength(0);
  });

  it("prevents user B from reading, creating, updating, reviewing, or deleting user A's flashcards", async () => {
    const userA = await registerUser();
    const userB = await registerUser();
    const aHeaders = { Authorization: `Bearer ${userA.accessToken}` };
    const bHeaders = { Authorization: `Bearer ${userB.accessToken}` };
    const { topicId } = await setupTopic(aHeaders);

    const createRes = await request(app)
      .post(`/api/topics/${topicId}/flashcards`)
      .set(aHeaders)
      .send({ question: "q", answer: "a" });
    const flashcardId = createRes.body.id as string;

    expect(
      (await request(app).get(`/api/topics/${topicId}/flashcards`).set(bHeaders)).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .post(`/api/topics/${topicId}/flashcards`)
          .set(bHeaders)
          .send({ question: "q2", answer: "a2" })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .patch(`/api/flashcards/${flashcardId}`)
          .set(bHeaders)
          .send({ answer: "hijacked" })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .patch(`/api/flashcards/${flashcardId}/review`)
          .set(bHeaders)
          .send({ result: "known" })
      ).status,
    ).toBe(404);
    expect(
      (await request(app).delete(`/api/flashcards/${flashcardId}`).set(bHeaders)).status,
    ).toBe(404);

    // Sanity check: user A can still access it.
    expect(
      (await request(app).get(`/api/topics/${topicId}/flashcards`).set(aHeaders)).status,
    ).toBe(200);
  });
});
