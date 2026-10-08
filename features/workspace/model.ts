import { z } from "zod";

const id = z.string().regex(/^[a-zA-Z0-9-]{1,80}$/);
export const lessonSchema = z.object({
  id,
  courseId: id,
  title: z.string().trim().min(3).max(120),
  module: z.string().trim().min(1).max(100),
  body: z.string().trim().min(20).max(30000),
  videoUrl: z
    .string()
    .max(2000)
    .refine(
      (value) => !value || /^https:\/\//.test(value),
      "Video manzili https:// bilan boshlansin.",
    ),
  minutes: z.number().int().min(1).max(600),
  order: z.number().int().min(1).max(999),
  published: z.boolean(),
  createdAt: z.string().datetime({ offset: true }).optional(),
  updatedAt: z.string().datetime({ offset: true }).optional(),
});
export const questionSchema = z.object({
  id,
  text: z.string().trim().min(3).max(1000),
  options: z.array(z.string().trim().min(1).max(500)).length(4),
  correct: z.number().int().min(0).max(3),
  // Older quizzes and saved attempts use one point per question.
  points: z.number().int().min(1).max(100).optional(),
  explanation: z.string().max(2000),
});
export const quizSchema = z.object({
  id,
  revision: z.string().uuid().optional(),
  courseId: id,
  title: z.string().trim().min(3).max(120),
  passScore: z.number().int().min(1).max(100),
  // Existing locally stored quizzes may not contain this newer setting.
  maxAttempts: z.number().int().min(1).max(10).optional(),
  published: z.boolean(),
  questions: z
    .array(questionSchema)
    .min(1)
    .max(30)
    .refine((q) => new Set(q.map((x) => x.id)).size === q.length),
});
export const studentSchema = z.object({
  id,
  invitation: z.boolean().optional(),
  invitationState: z.enum(["draft", "sending", "sent", "failed"]).optional(),
  invitationSentAt: z.string().datetime({ offset: true }).optional(),
  invitationUserId: z.string().uuid().optional(),
  updatedAt: z.string().datetime({ offset: true }).optional(),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(160),
  bio: z.string().max(1000),
  status: z.enum(["active", "invited", "paused"]),
  courseIds: z.array(id).max(500),
  createdAt: z.string().datetime({ offset: true }).optional(),
  invitationExpiresAt: z.string().datetime({ offset: true }).optional(),
  language: z.enum(["uz", "en", "ru"]).optional(),
  avatar: z.string().max(400000).refine(value => !value || /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value), "Profil rasmini qayta tanlang.").optional(),
});
export const attemptSchema = z.object({
  id,
  quizId: id,
  studentId: id,
  courseId: id,
  title: z.string(),
  studentName: z.string(),
  createdAt: z.string().datetime({ offset: true }),
  score: z.number().int().min(0).max(100),
  passScore: z.number().int().min(1).max(100),
  answers: z.array(z.number().int().min(0).max(3)),
  questions: z.array(questionSchema),
});
export const workspaceSchema = z.object({
  version: z.literal(1),
  revision: z.number().int().min(0),
  students: z.array(studentSchema).max(1000),
  lessons: z.array(lessonSchema).max(2000),
  quizzes: z.array(quizSchema).max(500),
  attempts: z.array(attemptSchema).max(5000),
  completed: z.record(z.array(id)),
  notes: z.record(z.string().max(10000)),
  selectedStudentId: id,
  preferences: z.object({
    weeklyGoal: z.number().int().min(1).max(40),
    compact: z.boolean(),
    ownerBio: z.string().max(1000),
    showNotifications: z.boolean().default(true),
    updatedAt: z.string().datetime({ offset: true }).optional(),
  }),
});
export type Lesson = z.infer<typeof lessonSchema>;
export type Quiz = z.infer<typeof quizSchema>;
export type Student = z.infer<typeof studentSchema>;
export type Attempt = z.infer<typeof attemptSchema>;
export type WorkspaceData = z.infer<typeof workspaceSchema>;

// Student questions omit answer keys; authoring still uses the strict quiz schema.
export const quizViewSchema = quizSchema.extend({
  questions: z.array(questionSchema.omit({ correct: true, explanation: true }).extend({
    correct: questionSchema.shape.correct.optional(),
    explanation: questionSchema.shape.explanation.optional(),
  })).max(30),
});
export type QuizView = z.infer<typeof quizViewSchema>;
export const taskSchema = z.object({
  id: z.string().uuid(), title: z.string().trim().min(3).max(160), completed: z.boolean(),
  updatedAt: z.string().datetime({ offset: true }).optional(),
  dueAt: z.string().datetime({ offset: true }).nullable().optional(),
});
export type LiveWorkspaceData = Omit<WorkspaceData, "quizzes"> & { quizzes: QuizView[]; tasks: z.infer<typeof taskSchema>[] };
export const emptyWorkspace: LiveWorkspaceData = {
  version: 1, revision: 0, students: [], lessons: [], quizzes: [], attempts: [],
  completed: {}, notes: {}, selectedStudentId: "none", tasks: [],
  preferences: { weeklyGoal: 5, compact: false, ownerBio: "", showNotifications: true },
};

const lessonText = [
  [
    "HTML semantikasi",
    "HTML sahifaning tuzilishini ifodalaydi. header, nav, main va footer elementlari kontentning vazifasini aniq ko‘rsatadi.\n\nHar bir sahifada mazmunli asosiy sarlavha bo‘lsin. Tugma amal bajarish, havola esa boshqa manzilga o‘tish uchun ishlatiladi.\n\nAmaliyot: o‘zingiz haqingizda kichik sahifa tuzing. Bir h1, ikki section, uchta havola va footer qo‘shing. HTML tuzilmasini o‘qib, har bir element nima vazifa bajarishini tushuntiring.",
  ],
  [
    "CSS layout va Flexbox",
    "Flexbox elementlarni bir o‘lcham bo‘yicha tartiblashga yordam beradi. Konteynerga display: flex yoziladi; gap elementlar orasidagi masofani belgilaydi.\n\njustify-content asosiy yo‘nalishda, align-items esa unga ko‘ndalang yo‘nalishda joylashtiradi. flex-wrap kichik ekranlarda elementlarni keyingi qatorga tushiradi.\n\nAmaliyot: uchta kurs kartasini yonma-yon qo‘ying. Ekran kichrayganda kartalar yangi qatorga o‘tsin. Matn sig‘may qolganda uni yashirish o‘rniga layoutni moslang.",
  ],
  [
    "Responsive sahifa",
    "Responsive dizayn ekran kengligiga moslashadi. Qat’iy kengliklar o‘rniga moslashuvchan grid, max-width va nisbiy o‘lchovlardan foydalaning.\n\nMedia query yordamida tor ekranda ustunlarni kamaytirish mumkin. Matnni kattalashtirish, klaviatura navigatsiyasi va fokus holatini ham tekshiring.\n\nAmaliyot: oldingi darsdagi kurs kartalarini telefonda bitta, katta ekranda uchta ustunda ko‘rsating. 200% matn kattaligida tugmalar ishlashini tekshiring.",
  ],
  [
    "O‘zgaruvchilar va turlar",
    "JavaScript ma’lumotlarni o‘zgaruvchilarda saqlaydi. const qayta tayinlanmaydigan bog‘lanishni, let qayta qiymat berish mumkin bo‘lgan bog‘lanishni yaratadi.\n\nString matnni, number sonni, boolean true yoki false qiymatini ifodalaydi. undefined hali qiymat berilmagan holatni bildiradi.\n\nAmaliyot: kurs nomini const bilan, talaba sonini let bilan saqlang. Talaba sonini birga oshiring va natijani console.log orqali chiqaring.",
  ],
  [
    "Massivlar va funksiyalar",
    "Massiv bir nechta qiymatni tartib bilan saqlaydi. map har bir elementdan yangi qiymat yaratadi, filter shartga moslarini ajratadi.\n\nFunksiya kiruvchi ma’lumotni qabul qilib natija qaytaradi. Bir vazifali kichik funksiyalarni tekshirish va qayta ishlatish osonroq.\n\nAmaliyot: uchta kursdan iborat massiv tuzing. Talabasi 50 dan ko‘p kurslarni filter bilan tanlang va map orqali faqat nomlarini oling.",
  ],
  [
    "Asinxron kod",
    "Tarmoq so‘rovi darhol tugamaydi. Promise keyinroq olinadigan natijani ifodalaydi. async funksiya ichida await bilan natijani kutish mumkin.\n\nSo‘rov muvaffaqiyatsiz bo‘lishi mumkin. try/catch bilan xatoni ushlang, foydalanuvchiga tushunarli xabar bering va kiritgan matnini yo‘qotmang.\n\nAmaliyot: Promise.resolve bilan namuna kurslar ro‘yxatini qaytaring. Uni async funksiya orqali oling va natijani chiqaring.",
  ],
  [
    "Dizayn tokenlari",
    "Dizayn tokenlari rang, oraliq, radius va shrift kabi takrorlanuvchi qiymatlarni markazlashtiradi. Bu sahifalarni bir xil uslubda saqlaydi.\n\nMasalan, primary rangi asosiy tugmalar uchun, muted rangi ikkinchi darajali matn uchun ishlatiladi. Rangning vazifasini nomlash keyin o‘zgartirishni osonlashtiradi.\n\nAmaliyot: asosiy rang, fon, chegara va matn uchun to‘rtta CSS o‘zgaruvchi yarating. Ikkita kartada bir xil tokenlardan foydalaning.",
  ],
  [
    "Komponent holatlari",
    "Tugma faqat odatiy holatdan iborat emas. Hover, focus, disabled va loading holatlari ham dizaynning bir qismidir.\n\nFokus klaviatura bilan ishlayotgan odamga qayerda turganini ko‘rsatadi. Disabled tugma nega ishlamasligi matn orqali tushunarli bo‘lsin.\n\nAmaliyot: asosiy va ikkilamchi tugma yarating. Har ikkalasi uchun fokus chizig‘i va bosilmaydigan holatni yozing.",
  ],
  [
    "Qulay forma",
    "Forma maydonlari aniq label bilan bog‘lanishi kerak. Placeholder label o‘rnini bosmaydi. Xato xabari aynan qaysi maydonni tuzatish kerakligini aytsin.\n\nYuborishda xatolik bo‘lsa, foydalanuvchi yozgan ma’lumotlarni saqlang. Muvaffaqiyat xabari faqat saqlash haqiqatan tugagandan keyin ko‘rsatilsin.\n\nAmaliyot: ism va email maydonlaridan iborat forma yarating. Bo‘sh qiymatlarni tekshiring va birinchi xato maydoniga fokus bering.",
  ],
];
export const seedWorkspace: WorkspaceData = {
  version: 1,
  revision: 0,
  students: [
    {
      id: "aziza",
      name: "Aziza Rasulova",
      email: "aziza@example.com",
      bio: "Frontend o‘rganishni boshladim.",
      status: "active",
      courseIds: ["frontend", "javascript"],
    },
    {
      id: "sardor",
      name: "Sardor Rahimov",
      email: "sardor@example.com",
      bio: "Amaliy loyihalar ustida ishlayman.",
      status: "active",
      courseIds: ["javascript"],
    },
    {
      id: "madina",
      name: "Madina Usmonova",
      email: "madina@example.com",
      bio: "Interfeys dizayniga qiziqaman.",
      status: "active",
      courseIds: ["ui"],
    },
  ],
  lessons: lessonText.map(([title, body], index) => ({
    id: `lesson-${index + 1}`,
    courseId: ["frontend", "javascript", "ui"][Math.floor(index / 3)],
    title,
    body,
    module: "Asosiy bilimlar",
    videoUrl: "",
    minutes: [12, 18, 15][index % 3],
    order: (index % 3) + 1,
    published: true,
  })),
  quizzes: [
    {
      id: "quiz-frontend",
      courseId: "frontend",
      title: "Frontend asoslari",
      passScore: 67,
      published: true,
      questions: [
        {
          id: "f1",
          text: "Sahifaning asosiy kontenti qaysi elementda joylashadi?",
          options: ["main", "footer", "nav", "aside"],
          correct: 0,
          explanation: "main sahifaning asosiy mazmunini bildiradi.",
        },
        {
          id: "f2",
          text: "Flexbox’da elementlar orasidagi masofa qaysi xossa bilan beriladi?",
          options: ["color", "gap", "font-weight", "opacity"],
          correct: 1,
          explanation:
            "gap konteyner ichidagi elementlar orasidagi masofani belgilaydi.",
        },
        {
          id: "f3",
          text: "Responsive dizaynning vazifasi nima?",
          options: [
            "Faqat rangni o‘zgartirish",
            "Faqat katta ekran",
            "Turli ekranlarga moslashish",
            "Matnni yashirish",
          ],
          correct: 2,
          explanation:
            "Responsive layout turli ekran o‘lchamlariga moslashadi.",
        },
      ],
    },
    {
      id: "quiz-javascript",
      courseId: "javascript",
      title: "JavaScript bilimlari",
      passScore: 67,
      published: true,
      questions: [
        {
          id: "j1",
          text: "Qayta qiymat beriladigan o‘zgaruvchi qaysi?",
          options: ["const", "let", "import", "return"],
          correct: 1,
          explanation:
            "let bilan e’lon qilingan bog‘lanishga yangi qiymat tayinlash mumkin.",
        },
        {
          id: "j2",
          text: "Shartga mos elementlarni qaysi metod tanlaydi?",
          options: ["map", "push", "filter", "join"],
          correct: 2,
          explanation:
            "filter shartni qanoatlantiradigan elementlardan yangi massiv qaytaradi.",
        },
        {
          id: "j3",
          text: "await odatda qayerda ishlatiladi?",
          options: [
            "async funksiya ichida",
            "CSS ichida",
            "HTML atributida",
            "Faqat izohda",
          ],
          correct: 0,
          explanation:
            "async funksiya ichida await Promise natijasini kutish uchun ishlatiladi.",
        },
      ],
    },
    {
      id: "quiz-ui",
      courseId: "ui",
      title: "UI tizimlari",
      passScore: 67,
      published: true,
      questions: [
        {
          id: "u1",
          text: "Dizayn tokeni nimani markazlashtiradi?",
          options: [
            "Parollarni",
            "Rang va oraliq kabi qiymatlarni",
            "Server IP manzilini",
            "Email xabarlarini",
          ],
          correct: 1,
          explanation: "Tokenlar dizayn qiymatlarini bir joyda boshqaradi.",
        },
        {
          id: "u2",
          text: "Klaviatura foydalanuvchisi uchun qaysi holat muhim?",
          options: ["Faqat hover", "Faqat rang", "Focus", "Hech biri"],
          correct: 2,
          explanation: "Fokus foydalanuvchining joriy elementini ko‘rsatadi.",
        },
        {
          id: "u3",
          text: "Maydon nomi uchun nimadan foydalaniladi?",
          options: [
            "Faqat placeholder",
            "Faqat rang",
            "Rasm",
            "Bog‘langan label",
          ],
          correct: 3,
          explanation: "Label maydonning doimiy va qulay nomini beradi.",
        },
      ],
    },
  ],
  attempts: [],
  completed: { aziza: ["lesson-1"], sardor: [], madina: [] },
  notes: {},
  selectedStudentId: "aziza",
  preferences: {
    showNotifications: true,
    weeklyGoal: 5,
    compact: false,
    ownerBio: "Ta’lim orqali yangi imkoniyatlar yaratamiz.",
  },
};
export function scoreQuiz(quiz: Quiz, answers: number[]) {
  if (
    answers.length !== quiz.questions.length ||
    answers.some(
      (answer) => !Number.isInteger(answer) || answer < 0 || answer > 3,
    )
  )
    throw new Error("Barcha savollarga javob bering.");
  const possible = quiz.questions.reduce(
    (total, question) => total + (question.points ?? 1), 0,
  );
  const earned = quiz.questions.reduce(
    (total, question, index) => total + (question.correct === answers[index] ? question.points ?? 1 : 0), 0,
  );
  return Math.round(earned / possible * 100);
}
export function studentProgress(
  state: Pick<WorkspaceData, "lessons" | "completed">,
  studentId: string,
  courseId: string,
) {
  const lessons = state.lessons.filter(
    (lesson) => lesson.courseId === courseId && lesson.published,
  );
  const completed = lessons.filter((lesson) =>
    state.completed[studentId]?.includes(lesson.id),
  ).length;
  return {
    total: lessons.length,
    completed,
    percent: lessons.length
      ? Math.round((completed / lessons.length) * 100)
      : 0,
  };
}
