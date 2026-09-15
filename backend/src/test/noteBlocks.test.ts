import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, registerUser } from "./helpers.js";

async function setupNote(headers: Record<string, string>) {
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
    .send({ name: "Wellen" });
  const topicId = topicRes.body.id as string;

  const noteRes = await request(app)
    .post(`/api/topics/${topicId}/notes`)
    .set(headers)
    .send({ title: "Wellen Notiz" });

  return { noteId: noteRes.body.id as string };
}

const TINY_PDF = Buffer.from("%PDF-1.4 fake pdf content for tests");
const TINY_VIDEO = Buffer.from("fake mp4 bytes for tests");

describe("Note blocks", () => {
  it("a freshly created note starts with a single empty text block", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };
    const { noteId } = await setupNote(headers);

    const res = await request(app).get(`/api/notes/${noteId}`).set(headers);
    expect(res.status).toBe(200);
    expect(res.body.blocks).toHaveLength(1);
    expect(res.body.blocks[0].type).toBe("TEXT");
  });

  it("creates, updates, reorders, and deletes text/link blocks", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };
    const { noteId } = await setupNote(headers);

    const linkRes = await request(app)
      .post(`/api/notes/${noteId}/blocks/link`)
      .set(headers)
      .send({ url: "https://example.com" });
    expect(linkRes.status).toBe(201);
    expect(linkRes.body.type).toBe("LINK");
    const linkBlockId = linkRes.body.id as string;

    const textRes = await request(app)
      .post(`/api/notes/${noteId}/blocks/text`)
      .set(headers)
      .send({ contentJson: { type: "doc", content: [] } });
    expect(textRes.status).toBe(201);
    const secondTextBlockId = textRes.body.id as string;

    const listRes = await request(app).get(`/api/notes/${noteId}/blocks`).set(headers);
    expect(listRes.body).toHaveLength(3);

    // Reorder: move the link block to the front.
    const orderedIds = [linkBlockId, ...listRes.body
      .filter((b: { id: string }) => b.id !== linkBlockId)
      .map((b: { id: string }) => b.id)];
    const reorderRes = await request(app)
      .patch(`/api/notes/${noteId}/blocks/reorder`)
      .set(headers)
      .send({ orderedIds });
    expect(reorderRes.status).toBe(200);
    expect(reorderRes.body[0].id).toBe(linkBlockId);

    // Update the link block's URL, and reject updating its contentJson.
    const updateRes = await request(app)
      .patch(`/api/blocks/${linkBlockId}`)
      .set(headers)
      .send({ url: "https://example.org" });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.url).toBe("https://example.org");

    const badUpdateRes = await request(app)
      .patch(`/api/blocks/${linkBlockId}`)
      .set(headers)
      .send({ contentJson: { type: "doc", content: [] } });
    expect(badUpdateRes.status).toBe(400);

    const deleteRes = await request(app)
      .delete(`/api/blocks/${secondTextBlockId}`)
      .set(headers);
    expect(deleteRes.status).toBe(204);

    const finalList = await request(app).get(`/api/notes/${noteId}/blocks`).set(headers);
    expect(finalList.body).toHaveLength(2);
  });

  it("uploads a PDF, creates one block per page, and serves the file back", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };
    const { noteId } = await setupNote(headers);

    const uploadRes = await request(app)
      .post("/api/uploads")
      .set(headers)
      .attach("file", TINY_PDF, { filename: "skript.pdf", contentType: "application/pdf" });
    expect(uploadRes.status).toBe(201);
    const fileId = uploadRes.body.id as string;

    const pdfRes = await request(app)
      .post(`/api/notes/${noteId}/blocks/pdf`)
      .set(headers)
      .send({ fileId, pageCount: 3 });
    expect(pdfRes.status).toBe(201);
    expect(pdfRes.body).toHaveLength(3);
    expect(pdfRes.body.map((b: { pageNumber: number }) => b.pageNumber)).toEqual([1, 2, 3]);
    expect(pdfRes.body.every((b: { fileId: string }) => b.fileId === fileId)).toBe(true);

    const fileRes = await request(app).get(`/api/files/${fileId}`).set(headers);
    expect(fileRes.status).toBe(200);
    expect(fileRes.headers["content-type"]).toBe("application/pdf");

    // Also reachable via the query-string token fallback used by <video>/<iframe>.
    const tokenRes = await request(app).get(`/api/files/${fileId}?token=${user.accessToken}`);
    expect(tokenRes.status).toBe(200);
  });

  it("rejects attaching a non-PDF file as a PDF block and a non-video file as a video block", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };
    const { noteId } = await setupNote(headers);

    const uploadRes = await request(app)
      .post("/api/uploads")
      .set(headers)
      .attach("file", TINY_VIDEO, { filename: "clip.mp4", contentType: "video/mp4" });
    const fileId = uploadRes.body.id as string;

    const pdfRes = await request(app)
      .post(`/api/notes/${noteId}/blocks/pdf`)
      .set(headers)
      .send({ fileId, pageCount: 1 });
    expect(pdfRes.status).toBe(400);

    const videoRes = await request(app)
      .post(`/api/notes/${noteId}/blocks/video`)
      .set(headers)
      .send({ fileId });
    expect(videoRes.status).toBe(201);
    expect(videoRes.body.type).toBe("VIDEO");
  });

  it("rejects uploads with an unsupported mime type", async () => {
    const user = await registerUser();
    const headers = { Authorization: `Bearer ${user.accessToken}` };

    const res = await request(app)
      .post("/api/uploads")
      .set(headers)
      .attach("file", Buffer.from("nope"), { filename: "malware.exe", contentType: "application/x-msdownload" });
    expect(res.status).toBe(400);
  });

  it("prevents user B from reading, updating, or serving user A's blocks and files", async () => {
    const userA = await registerUser();
    const userB = await registerUser();
    const aHeaders = { Authorization: `Bearer ${userA.accessToken}` };
    const bHeaders = { Authorization: `Bearer ${userB.accessToken}` };
    const { noteId } = await setupNote(aHeaders);

    const uploadRes = await request(app)
      .post("/api/uploads")
      .set(aHeaders)
      .attach("file", TINY_PDF, { filename: "skript.pdf", contentType: "application/pdf" });
    const fileId = uploadRes.body.id as string;

    const blockRes = await request(app)
      .post(`/api/notes/${noteId}/blocks/text`)
      .set(aHeaders)
      .send({ contentJson: { type: "doc", content: [] } });
    const blockId = blockRes.body.id as string;

    expect((await request(app).get(`/api/notes/${noteId}/blocks`).set(bHeaders)).status).toBe(
      404,
    );
    expect(
      (
        await request(app)
          .patch(`/api/blocks/${blockId}`)
          .set(bHeaders)
          .send({ contentJson: { type: "doc", content: [] } })
      ).status,
    ).toBe(404);
    expect((await request(app).delete(`/api/blocks/${blockId}`).set(bHeaders)).status).toBe(404);
    expect((await request(app).get(`/api/files/${fileId}`).set(bHeaders)).status).toBe(404);
    expect(
      (
        await request(app)
          .post(`/api/notes/${noteId}/blocks/video`)
          .set(bHeaders)
          .send({ fileId })
      ).status,
    ).toBe(404);
  });
});
