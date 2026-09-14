import { prisma } from "../../lib/prisma.js";

export async function getDashboard(userId: string) {
  const settings = await prisma.settings.findUnique({ where: { userId } });
  const currentGradeLevel = settings?.currentGradeLevel ?? 5;

  const subjects = await prisma.subject.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: {
      noteSectionTypes: {
        orderBy: { sortOrder: "asc" },
        include: {
          notes: {
            where: { gradeLevel: currentGradeLevel },
            select: { id: true },
          },
        },
      },
    },
  });

  const quickLinks = subjects.flatMap((subject) =>
    subject.noteSectionTypes.map((sectionType) => ({
      subjectId: subject.id,
      subjectName: subject.name,
      color: subject.color,
      sectionTypeId: sectionType.id,
      sectionTypeName: sectionType.name,
      hasContent: sectionType.notes.length > 0,
    })),
  );

  const now = new Date();

  const [upcomingHomework, upcomingEvents, generalNotesRaw] = await Promise.all([
    prisma.homework.findMany({
      where: { userId, done: false },
      include: { subject: true },
      orderBy: [{ dueDate: "asc" }],
      take: 10,
    }),
    prisma.calendarEvent.findMany({
      where: { userId, startDate: { gte: now } },
      orderBy: { startDate: "asc" },
      take: 10,
    }),
    prisma.generalNote.findMany({ where: { userId }, orderBy: { sortOrder: "asc" } }),
  ]);

  const generalNotes = generalNotesRaw.map((note) => ({
    ...note,
    contentJson: JSON.parse(note.contentJson) as unknown,
  }));

  return {
    currentGradeLevel,
    quickLinks,
    upcomingHomework,
    upcomingEvents,
    generalNotes,
  };
}
