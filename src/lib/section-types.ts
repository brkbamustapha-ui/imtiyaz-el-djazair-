import type { LocalizedText } from "./i18n";

/* -------------------------------------------------------------------------
 * The CMS is schema-driven: a section type declares its fields once, and the
 * admin renders the editor form for it automatically. Adding a new block to
 * the website therefore means adding one entry here plus one React component.
 * ---------------------------------------------------------------------- */

export type FieldType =
  | "text"
  | "textarea"
  | "localizedText"
  | "localizedTextarea"
  | "localizedRichText"
  | "image"
  | "video"
  | "number"
  | "boolean"
  | "select"
  | "color"
  | "link"
  | "repeater";

export type FieldOption = { value: string; label: string };

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  help?: string;
  placeholder?: string;
  options?: FieldOption[];
  min?: number;
  max?: number;
  step?: number;
  /** For `repeater`: the shape of each row. */
  fields?: Field[];
  /** For `repeater`: which sub-field is used as the row heading. */
  itemLabelField?: string;
  addLabel?: string;
  /** Only render this field when another boolean/select field has a value. */
  showWhen?: { field: string; equals: string | boolean | number };
  group?: string;
};

export type SectionTypeDefinition = {
  type: string;
  label: string;
  description: string;
  icon: string;
  /** Content collections this block pulls from, shown as a hint in the builder. */
  dataSource?: string;
  fields: Field[];
  defaults: Record<string, unknown>;
};

export type CtaValue = { label: LocalizedText; href: string };

const CTA_FIELDS: Field[] = [
  { name: "label", label: "Button label", type: "localizedText" },
  { name: "href", label: "Button link", type: "link" },
];

function cta(name: string, label: string, group = "Call to action"): Field {
  return {
    name,
    label,
    type: "repeater",
    fields: CTA_FIELDS,
    itemLabelField: "label",
    addLabel: "Add button",
    max: 1,
    group,
    help: "Leave empty to hide this button.",
  };
}

const ALIGN_OPTIONS: FieldOption[] = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
];

export const SECTION_TYPES: SectionTypeDefinition[] = [
  {
    type: "hero",
    label: "Hero",
    description: "Full-height opening section with the 3D scene.",
    icon: "sparkles",
    fields: [
      { name: "badge", label: "Badge / eyebrow", type: "localizedText", group: "Content" },
      { name: "title", label: "Main title", type: "localizedText", group: "Content" },
      { name: "subtitle", label: "Subtitle", type: "localizedText", group: "Content" },
      { name: "description", label: "Description", type: "localizedTextarea", group: "Content" },
      cta("primaryCta", "Primary button"),
      cta("secondaryCta", "Secondary button"),
      {
        name: "backgroundType",
        label: "Background",
        type: "select",
        group: "Background",
        options: [
          { value: "3d", label: "3D scene" },
          { value: "image", label: "Image" },
          { value: "video", label: "Video" },
          { value: "gradient", label: "Gradient" },
          { value: "color", label: "Solid colour" },
        ],
      },
      { name: "backgroundImage", label: "Background image", type: "image", group: "Background", showWhen: { field: "backgroundType", equals: "image" } },
      { name: "backgroundVideo", label: "Background video URL", type: "video", group: "Background", showWhen: { field: "backgroundType", equals: "video" } },
      { name: "backgroundColor", label: "Background colour", type: "color", group: "Background", showWhen: { field: "backgroundType", equals: "color" } },
      { name: "overlayOpacity", label: "Overlay darkness", type: "number", min: 0, max: 1, step: 0.05, group: "Background" },
      { name: "particleIntensity", label: "Particle intensity", type: "number", min: 0, max: 1, step: 0.05, group: "Background", help: "Automatically reduced on low-power devices." },
      { name: "align", label: "Text alignment", type: "select", options: ALIGN_OPTIONS, group: "Layout" },
      { name: "showScrollHint", label: "Show scroll indicator", type: "boolean", group: "Layout" },
      { name: "showStats", label: "Show quick stats strip", type: "boolean", group: "Layout" },
    ],
    defaults: {
      badge: { en: "British Council IELTS Partnership Programme member", fr: "Membre du programme de partenariat IELTS du British Council", ar: "عضو في برنامج شراكة الآيلتس مع المجلس الثقافي البريطاني" },
      title: { en: "IMTIYAZ EL DJAZAIR", fr: "IMTIYAZ EL DJAZAIR", ar: "امتياز الجزائر" },
      subtitle: { en: "School & Exam Center", fr: "École et Centre d'Examen", ar: "مدرسة ومركز امتحانات" },
      description: {
        en: "Excellence in Education. Confidence for Your Future.",
        fr: "L'excellence en éducation. La confiance pour votre avenir.",
        ar: "التميّز في التعليم. الثقة من أجل مستقبلك.",
      },
      primaryCta: [{ label: { en: "Discover Our School", fr: "Découvrir l'école", ar: "اكتشف مدرستنا" }, href: "/about" }],
      secondaryCta: [{ label: { en: "Explore IELTS", fr: "Découvrir l'IELTS", ar: "استكشف الآيلتس" }, href: "/ielts" }],
      backgroundType: "3d",
      backgroundImage: "",
      backgroundVideo: "",
      backgroundColor: "#070b14",
      overlayOpacity: 0.35,
      particleIntensity: 0.7,
      align: "left",
      showScrollHint: true,
      showStats: true,
    },
  },
  {
    type: "partners",
    label: "Partners & Sponsors",
    description: "Logo wall driven by the Partners manager.",
    icon: "handshake",
    dataSource: "Partners",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "localizedText" },
      { name: "title", label: "Title", type: "localizedText" },
      { name: "subtitle", label: "Subtitle", type: "localizedTextarea" },
      {
        name: "filterType",
        label: "Show",
        type: "select",
        options: [
          { value: "ALL", label: "All partners" },
          { value: "PARTNER", label: "Partners only" },
          { value: "SPONSOR", label: "Sponsors only" },
          { value: "CERTIFICATION", label: "Certifications only" },
          { value: "ASSOCIATION", label: "Associations only" },
        ],
      },
      { name: "layout", label: "Layout", type: "select", options: [{ value: "cards", label: "Cards" }, { value: "strip", label: "Logo strip" }] },
      { name: "disclaimer", label: "Legal note under the logos", type: "localizedText", help: "Displayed verbatim. Keep it accurate about the nature of each relationship." },
    ],
    defaults: {
      eyebrow: { en: "International Excellence", fr: "Excellence internationale", ar: "التميّز الدولي" },
      title: { en: "Partners & Accreditations", fr: "Partenaires et accréditations", ar: "الشركاء والاعتمادات" },
      subtitle: {
        en: "The organisations we work with, and the programmes we deliver on our campus.",
        fr: "Les organisations avec lesquelles nous travaillons et les programmes que nous proposons sur notre campus.",
        ar: "المؤسسات التي نعمل معها والبرامج التي نقدمها في مقرّنا.",
      },
      filterType: "ALL",
      layout: "cards",
      disclaimer: {
        en: "Logos are the property of their respective owners and are shown with the permission of the school's partners.",
        fr: "Les logos sont la propriété de leurs détenteurs respectifs et sont affichés avec l'accord des partenaires de l'école.",
        ar: "الشعارات ملك لأصحابها وتُعرض بموافقة شركاء المدرسة.",
      },
    },
  },
  {
    type: "about",
    label: "About / Text + Image",
    description: "Introduction with an image, bullet points and a button.",
    icon: "info",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "localizedText", group: "Content" },
      { name: "title", label: "Title", type: "localizedText", group: "Content" },
      { name: "body", label: "Body", type: "localizedRichText", group: "Content" },
      { name: "image", label: "Image", type: "image", group: "Media" },
      { name: "imagePosition", label: "Image position", type: "select", options: [{ value: "right", label: "Right" }, { value: "left", label: "Left" }], group: "Media" },
      {
        name: "bullets",
        label: "Highlights",
        type: "repeater",
        group: "Content",
        itemLabelField: "text",
        addLabel: "Add highlight",
        fields: [
          { name: "text", label: "Text", type: "localizedText" },
          { name: "icon", label: "Icon", type: "select", options: iconOptions() },
        ],
      },
      cta("primaryCta", "Button"),
    ],
    defaults: {
      eyebrow: { en: "About the school", fr: "À propos de l'école", ar: "عن المدرسة" },
      title: { en: "A school built for international ambition", fr: "Une école pensée pour l'ambition internationale", ar: "مدرسة مبنية للطموح الدولي" },
      body: {
        en: "<p>Imtiyaz El Djazair is a school and exam centre where students prepare for international English examinations in a professional, calm and exam-accurate environment.</p><p>Our teachers combine academic rigour with individual follow-up, so every learner knows exactly where they stand and what to do next.</p>",
        fr: "<p>Imtiyaz El Djazair est une école et un centre d'examen où les étudiants préparent les examens internationaux d'anglais dans un environnement professionnel, calme et fidèle aux conditions réelles.</p><p>Nos enseignants associent rigueur académique et suivi individuel : chaque apprenant sait précisément où il en est et quelle est la prochaine étape.</p>",
        ar: "<p>امتياز الجزائر مدرسة ومركز امتحانات يستعد فيه الطلاب لامتحانات اللغة الإنجليزية الدولية في بيئة مهنية وهادئة ومطابقة لظروف الامتحان.</p>",
      },
      image: "",
      imagePosition: "right",
      bullets: [
        { text: { en: "Exam-accurate test rooms", fr: "Salles conformes aux conditions d'examen", ar: "قاعات مطابقة لظروف الامتحان" }, icon: "shield" },
        { text: { en: "Small groups, individual follow-up", fr: "Petits groupes, suivi individuel", ar: "مجموعات صغيرة ومتابعة فردية" }, icon: "users" },
        { text: { en: "Experienced, certified teachers", fr: "Enseignants expérimentés et certifiés", ar: "أساتذة ذوو خبرة ومعتمدون" }, icon: "award" },
      ],
      primaryCta: [{ label: { en: "Our approach", fr: "Notre approche", ar: "منهجنا" }, href: "/about" }],
    },
  },
  {
    type: "valueCards",
    label: "Mission / Vision / Values",
    description: "Three or more editorial cards.",
    icon: "compass",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "localizedText" },
      { name: "title", label: "Title", type: "localizedText" },
      { name: "subtitle", label: "Subtitle", type: "localizedTextarea" },
      {
        name: "cards",
        label: "Cards",
        type: "repeater",
        itemLabelField: "title",
        addLabel: "Add card",
        fields: [
          { name: "title", label: "Title", type: "localizedText" },
          { name: "body", label: "Body", type: "localizedTextarea" },
          { name: "icon", label: "Icon", type: "select", options: iconOptions() },
        ],
      },
    ],
    defaults: {
      eyebrow: { en: "What drives us", fr: "Ce qui nous anime", ar: "ما يحرّكنا" },
      title: { en: "Mission, vision and method", fr: "Mission, vision et méthode", ar: "الرسالة والرؤية والمنهج" },
      subtitle: { en: "", fr: "", ar: "" },
      cards: [
        {
          title: { en: "Our Mission", fr: "Notre mission", ar: "رسالتنا" },
          body: {
            en: "Give every student in Algeria access to English teaching and examination standards that hold up anywhere in the world.",
            fr: "Offrir à chaque étudiant en Algérie un enseignement de l'anglais et des standards d'examen reconnus partout dans le monde.",
            ar: "منح كل طالب في الجزائر تعليمًا للغة الإنجليزية ومعايير امتحان معترفًا بها عالميًا.",
          },
          icon: "target",
        },
        {
          title: { en: "Our Vision", fr: "Notre vision", ar: "رؤيتنا" },
          body: {
            en: "To be the reference centre where Algerian students prepare, sit and succeed in international examinations.",
            fr: "Être le centre de référence où les étudiants algériens se préparent, passent et réussissent les examens internationaux.",
            ar: "أن نكون المركز المرجعي الذي يستعد فيه الطلاب الجزائريون للامتحانات الدولية وينجحون فيها.",
          },
          icon: "globe",
        },
        {
          title: { en: "Our Approach", fr: "Notre approche", ar: "منهجنا" },
          body: {
            en: "Diagnostic assessment, a levelled study plan, weekly mock conditions and measurable progress tracking.",
            fr: "Évaluation diagnostique, plan d'étude par niveau, examens blancs hebdomadaires et suivi de progression mesurable.",
            ar: "تقييم تشخيصي وخطة دراسية متدرجة واختبارات تجريبية أسبوعية وتتبّع قابل للقياس.",
          },
          icon: "chart",
        },
      ],
    },
  },
  {
    type: "services",
    label: "Services / Programs",
    description: "Card grid driven by the Services collection.",
    icon: "grid",
    dataSource: "Services",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "localizedText" },
      { name: "title", label: "Title", type: "localizedText" },
      { name: "subtitle", label: "Subtitle", type: "localizedTextarea" },
      { name: "columns", label: "Columns", type: "select", options: [{ value: "2", label: "2" }, { value: "3", label: "3" }] },
      { name: "limit", label: "Maximum cards", type: "number", min: 1, max: 24 },
      { name: "showCta", label: "Show 'Learn more' link on cards", type: "boolean" },
    ],
    defaults: {
      eyebrow: { en: "What we offer", fr: "Nos services", ar: "ما نقدمه" },
      title: { en: "Programs designed around results", fr: "Des programmes conçus pour les résultats", ar: "برامج مصممة لتحقيق النتائج" },
      subtitle: {
        en: "From general English to full IELTS preparation and official testing, in one place.",
        fr: "De l'anglais général à la préparation complète à l'IELTS et aux examens officiels, au même endroit.",
        ar: "من الإنجليزية العامة إلى التحضير الكامل للآيلتس والامتحانات الرسمية في مكان واحد.",
      },
      columns: "3",
      limit: 9,
      showCta: true,
    },
  },
  {
    type: "ielts",
    label: "IELTS journey",
    description: "The four skills, mock tests and progress tracking.",
    icon: "route",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "localizedText", group: "Content" },
      { name: "title", label: "Title", type: "localizedText", group: "Content" },
      { name: "subtitle", label: "Subtitle", type: "localizedTextarea", group: "Content" },
      {
        name: "modules",
        label: "Modules",
        type: "repeater",
        group: "Content",
        itemLabelField: "title",
        addLabel: "Add module",
        fields: [
          { name: "title", label: "Title", type: "localizedText" },
          { name: "description", label: "Description", type: "localizedTextarea" },
          { name: "icon", label: "Icon", type: "select", options: iconOptions() },
        ],
      },
      { name: "showJourney", label: "Show animated progress path", type: "boolean", group: "Layout" },
      cta("primaryCta", "Button"),
    ],
    defaults: {
      eyebrow: { en: "IELTS", fr: "IELTS", ar: "آيلتس" },
      title: { en: "Prepare. Perform. Succeed.", fr: "Préparer. Performer. Réussir.", ar: "استعد. أدِّ. انجح." },
      subtitle: {
        en: "A structured path through all four skills, with mock tests under real exam conditions and a band score you can track week by week.",
        fr: "Un parcours structuré sur les quatre compétences, avec des examens blancs en conditions réelles et un score suivi semaine après semaine.",
        ar: "مسار منظّم عبر المهارات الأربع مع اختبارات تجريبية في ظروف حقيقية ودرجة يمكنك متابعتها أسبوعيًا.",
      },
      modules: [
        { title: { en: "Listening", fr: "Compréhension orale", ar: "الاستماع" }, description: { en: "Accent range, note-taking discipline and question-type strategy.", fr: "Variété d'accents, prise de notes et stratégie par type de question.", ar: "تنوّع اللهجات وتدوين الملاحظات واستراتيجية أنواع الأسئلة." }, icon: "headphones" },
        { title: { en: "Reading", fr: "Compréhension écrite", ar: "القراءة" }, description: { en: "Skimming, scanning and time control across all passage types.", fr: "Lecture rapide, repérage et gestion du temps sur tous les types de textes.", ar: "القراءة السريعة والمسح وإدارة الوقت في جميع أنواع النصوص." }, icon: "book" },
        { title: { en: "Writing", fr: "Expression écrite", ar: "الكتابة" }, description: { en: "Task 1 and Task 2 frameworks, corrected against the official band descriptors.", fr: "Méthodes Task 1 et Task 2, corrigées selon les descripteurs officiels.", ar: "منهجيات المهمة 1 و2 مع تصحيح وفق المعايير الرسمية." }, icon: "pen" },
        { title: { en: "Speaking", fr: "Expression orale", ar: "المحادثة" }, description: { en: "One-to-one mock interviews with fluency, lexical and pronunciation feedback.", fr: "Entretiens blancs individuels avec retours sur fluidité, lexique et prononciation.", ar: "مقابلات تجريبية فردية مع ملاحظات حول الطلاقة والمفردات والنطق." }, icon: "mic" },
        { title: { en: "Mock Tests", fr: "Examens blancs", ar: "اختبارات تجريبية" }, description: { en: "Full-length papers sat in our exam rooms, timed exactly like the real test.", fr: "Épreuves complètes dans nos salles d'examen, chronométrées comme le jour J.", ar: "اختبارات كاملة في قاعاتنا بتوقيت مطابق للامتحان الحقيقي." }, icon: "clipboard" },
        { title: { en: "Progress Tracking", fr: "Suivi de progression", ar: "تتبّع التقدّم" }, description: { en: "A personal band-score report after each assessment, shared with the student.", fr: "Un rapport de score personnel après chaque évaluation, partagé avec l'étudiant.", ar: "تقرير درجات شخصي بعد كل تقييم يُشارك مع الطالب." }, icon: "chart" },
      ],
      showJourney: true,
      primaryCta: [{ label: { en: "Start Your IELTS Journey", fr: "Commencer votre parcours IELTS", ar: "ابدأ رحلتك مع الآيلتس" }, href: "/contact" }],
    },
  },
  {
    type: "examCenter",
    label: "Exam Center",
    description: "Test-day facilities and conditions.",
    icon: "building",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "localizedText" },
      { name: "title", label: "Title", type: "localizedText" },
      { name: "body", label: "Body", type: "localizedRichText" },
      { name: "image", label: "Image", type: "image" },
      {
        name: "features",
        label: "Facilities",
        type: "repeater",
        itemLabelField: "title",
        addLabel: "Add facility",
        fields: [
          { name: "title", label: "Title", type: "localizedText" },
          { name: "description", label: "Description", type: "localizedTextarea" },
          { name: "icon", label: "Icon", type: "select", options: iconOptions() },
        ],
      },
      cta("primaryCta", "Button"),
    ],
    defaults: {
      eyebrow: { en: "Exam Center", fr: "Centre d'examen", ar: "مركز الامتحانات" },
      title: { en: "A test day with no surprises", fr: "Un jour d'examen sans surprise", ar: "يوم امتحان بلا مفاجآت" },
      body: {
        en: "<p>Our centre is set up so that the exam itself is the only difficult part of the day: clear signage, a calm waiting area, controlled test rooms and staff who explain every step before it happens.</p>",
        fr: "<p>Notre centre est organisé pour que l'examen soit la seule difficulté de la journée : signalétique claire, espace d'attente calme, salles contrôlées et une équipe qui explique chaque étape à l'avance.</p>",
        ar: "<p>مركزنا مُنظّم بحيث يكون الامتحان وحده هو التحدي: إرشادات واضحة ومنطقة انتظار هادئة وقاعات مضبوطة وفريق يشرح كل خطوة مسبقًا.</p>",
      },
      image: "",
      features: [
        { title: { en: "Controlled test rooms", fr: "Salles d'examen contrôlées", ar: "قاعات امتحان مضبوطة" }, description: { en: "Individual desks, monitored access and exam-standard acoustics.", fr: "Postes individuels, accès surveillé et acoustique aux normes.", ar: "طاولات فردية ودخول مراقب وصوتيات وفق المعايير." }, icon: "shield" },
        { title: { en: "Trained invigilators", fr: "Surveillants formés", ar: "مراقبون مدرّبون" }, description: { en: "Staff briefed on the official procedure for every session.", fr: "Personnel formé à la procédure officielle pour chaque session.", ar: "طاقم مطّلع على الإجراءات الرسمية لكل جلسة." }, icon: "users" },
        { title: { en: "Candidate briefing", fr: "Briefing des candidats", ar: "إحاطة المترشحين" }, description: { en: "A walkthrough of identification, timing and room rules before you start.", fr: "Présentation de l'identification, du timing et des règles avant de commencer.", ar: "شرح لإجراءات الهوية والتوقيت وقواعد القاعة قبل البدء." }, icon: "clipboard" },
        { title: { en: "Accessible facilities", fr: "Accès facilité", ar: "مرافق ميسّرة" }, description: { en: "Ground-floor access and arrangements available on request.", fr: "Accès de plain-pied et aménagements possibles sur demande.", ar: "دخول من الطابق الأرضي وترتيبات عند الطلب." }, icon: "heart" },
      ],
      primaryCta: [{ label: { en: "Ask about a session", fr: "Demander une session", ar: "استفسر عن جلسة" }, href: "/contact" }],
    },
  },
  {
    type: "stats",
    label: "Statistics",
    description: "Animated counters from the Statistics collection.",
    icon: "chart",
    dataSource: "Statistics",
    fields: [
      { name: "title", label: "Title", type: "localizedText" },
      { name: "subtitle", label: "Subtitle", type: "localizedTextarea" },
      { name: "variant", label: "Style", type: "select", options: [{ value: "band", label: "Full-width band" }, { value: "cards", label: "Cards" }] },
    ],
    defaults: {
      title: { en: "Ten years of measurable results", fr: "Dix ans de résultats mesurables", ar: "عشر سنوات من النتائج الملموسة" },
      subtitle: { en: "", fr: "", ar: "" },
      variant: "band",
    },
  },
  {
    type: "gallery",
    label: "Gallery",
    description: "Campus photos with a lightbox.",
    icon: "image",
    dataSource: "Gallery",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "localizedText" },
      { name: "title", label: "Title", type: "localizedText" },
      { name: "subtitle", label: "Subtitle", type: "localizedTextarea" },
      { name: "album", label: "Album filter", type: "text", help: "Leave empty to show every album." },
      { name: "limit", label: "Maximum photos", type: "number", min: 1, max: 60 },
    ],
    defaults: {
      eyebrow: { en: "Campus", fr: "Campus", ar: "الحرم" },
      title: { en: "Inside Imtiyaz El Djazair", fr: "À l'intérieur d'Imtiyaz El Djazair", ar: "داخل امتياز الجزائر" },
      subtitle: { en: "Classrooms, exam rooms and the people who make them work.", fr: "Salles de cours, salles d'examen et les personnes qui les font vivre.", ar: "قاعات الدراسة والامتحان والأشخاص الذين يديرونها." },
      album: "",
      limit: 12,
    },
  },
  {
    type: "videoGallery",
    label: "Video gallery",
    description: "Video clips with cover images — a summer camp, an open day, a campus tour.",
    icon: "image",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "localizedText", group: "Content" },
      { name: "title", label: "Title", type: "localizedText", group: "Content" },
      { name: "subtitle", label: "Subtitle", type: "localizedTextarea", group: "Content" },
      { name: "body", label: "Introduction", type: "localizedRichText", group: "Content" },
      {
        name: "videos",
        label: "Clips",
        type: "repeater",
        group: "Clips",
        itemLabelField: "title",
        addLabel: "Add a clip",
        max: 12,
        fields: [
          { name: "title", label: "Caption", type: "localizedText" },
          { name: "src", label: "Video file", type: "video", help: "MP4. Upload it in the Media Library, or use a path such as /assets/video/summer-camp-01.mp4" },
          { name: "poster", label: "Cover image", type: "image", help: "Shown until the visitor presses play, so nothing downloads before then." },
        ],
      },
      {
        name: "columns",
        label: "Columns",
        type: "select",
        group: "Layout",
        options: [
          { value: "2", label: "2" },
          { value: "3", label: "3" },
          { value: "4", label: "4" },
        ],
      },
      { name: "tone", label: "Background", type: "select", group: "Layout", options: [{ value: "default", label: "Page background" }, { value: "surface", label: "Alternate background" }] },
      cta("primaryCta", "Button"),
    ],
    defaults: {
      eyebrow: { en: "Summer Camp", fr: "Colonie d'été", ar: "المخيم الصيفي" },
      title: {
        en: "Summer Camp",
        fr: "Summer Camp",
        ar: "المخيم الصيفي",
      },
      subtitle: {
        en: "Learning does not stop when the term does. Our summer programme mixes English practice with activities outside the classroom.",
        fr: "L'apprentissage ne s'arrête pas avec l'année scolaire. Notre programme d'été associe la pratique de l'anglais à des activités hors de la salle de classe.",
        ar: "لا يتوقف التعلّم بانتهاء العام الدراسي. يجمع برنامجنا الصيفي بين ممارسة اللغة الإنجليزية وأنشطة خارج القاعة.",
      },
      body: { en: "", fr: "", ar: "" },
      videos: [
        {
          title: { en: "Horse riding session", fr: "Séance d'équitation", ar: "حصة ركوب الخيل" },
          src: "/assets/video/summer-camp-01.mp4",
          poster: "/assets/video/posters/summer-camp-01.webp",
        },
        {
          title: { en: "In the riding arena", fr: "Dans la carrière", ar: "في الميدان" },
          src: "/assets/video/summer-camp-02.mp4",
          poster: "/assets/video/posters/summer-camp-02.webp",
        },
        {
          title: { en: "Meeting the horses", fr: "À la rencontre des chevaux", ar: "التعرّف على الخيول" },
          src: "/assets/video/summer-camp-03.mp4",
          poster: "/assets/video/posters/summer-camp-03.webp",
        },
      ],
      columns: "3",
      tone: "surface",
      primaryCta: [{ label: { en: "Ask about the summer camp", fr: "Se renseigner sur la colonie", ar: "استفسر عن المخيم" }, href: "/contact" }],
    },
  },
  {
    type: "testimonials",
    label: "Testimonials",
    description: "Student quotes from the Testimonials collection.",
    icon: "quote",
    dataSource: "Testimonials",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "localizedText" },
      { name: "title", label: "Title", type: "localizedText" },
      { name: "subtitle", label: "Subtitle", type: "localizedTextarea" },
      { name: "limit", label: "Maximum testimonials", type: "number", min: 1, max: 30 },
    ],
    defaults: {
      eyebrow: { en: "Testimonials", fr: "Témoignages", ar: "آراء الطلاب" },
      title: { en: "What our students say", fr: "Ce que disent nos étudiants", ar: "ماذا يقول طلابنا" },
      subtitle: { en: "", fr: "", ar: "" },
      limit: 9,
    },
  },
  {
    type: "news",
    label: "News & Events",
    description: "Latest articles from the News/Events collection.",
    icon: "news",
    dataSource: "News & Events",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "localizedText" },
      { name: "title", label: "Title", type: "localizedText" },
      { name: "subtitle", label: "Subtitle", type: "localizedTextarea" },
      { name: "source", label: "Show", type: "select", options: [{ value: "ALL", label: "News and events" }, { value: "NEWS", label: "News only" }, { value: "EVENT", label: "Events only" }] },
      { name: "limit", label: "Maximum items", type: "number", min: 1, max: 12 },
      cta("primaryCta", "Button"),
    ],
    defaults: {
      eyebrow: { en: "Newsroom", fr: "Actualités", ar: "الأخبار" },
      title: { en: "Latest news & events", fr: "Actualités et événements", ar: "آخر الأخبار والفعاليات" },
      subtitle: { en: "", fr: "", ar: "" },
      source: "ALL",
      limit: 3,
      primaryCta: [{ label: { en: "All news", fr: "Toutes les actualités", ar: "كل الأخبار" }, href: "/news" }],
    },
  },
  {
    type: "faq",
    label: "FAQ",
    description: "Accordion built from the FAQ collection.",
    icon: "help",
    dataSource: "FAQ",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "localizedText" },
      { name: "title", label: "Title", type: "localizedText" },
      { name: "subtitle", label: "Subtitle", type: "localizedTextarea" },
      { name: "limit", label: "Maximum questions", type: "number", min: 1, max: 30 },
    ],
    defaults: {
      eyebrow: { en: "FAQ", fr: "FAQ", ar: "أسئلة شائعة" },
      title: { en: "Questions we are asked every week", fr: "Les questions qu'on nous pose chaque semaine", ar: "أسئلة تصلنا كل أسبوع" },
      subtitle: { en: "", fr: "", ar: "" },
      limit: 8,
    },
  },
  {
    type: "cta",
    label: "Call to action",
    description: "Full-width conversion band.",
    icon: "megaphone",
    fields: [
      { name: "title", label: "Title", type: "localizedText" },
      { name: "description", label: "Description", type: "localizedTextarea" },
      cta("primaryCta", "Primary button"),
      cta("secondaryCta", "Secondary button"),
      { name: "variant", label: "Style", type: "select", options: [{ value: "gradient", label: "Gradient" }, { value: "outline", label: "Outline" }] },
    ],
    defaults: {
      title: { en: "Ready to start?", fr: "Prêt à commencer ?", ar: "هل أنت مستعد للبدء؟" },
      description: {
        en: "Book a placement assessment and we will tell you honestly where you stand and how long the next band will take.",
        fr: "Réservez un test de niveau : nous vous dirons honnêtement où vous en êtes et combien de temps prendra le niveau suivant.",
        ar: "احجز اختبار تحديد المستوى وسنخبرك بصراحة بمستواك والوقت اللازم للمستوى التالي.",
      },
      primaryCta: [{ label: { en: "Apply Now", fr: "S'inscrire", ar: "سجّل الآن" }, href: "/contact" }],
      secondaryCta: [{ label: { en: "Talk to us", fr: "Nous contacter", ar: "تواصل معنا" }, href: "/contact" }],
      variant: "gradient",
    },
  },
  {
    type: "contact",
    label: "Contact",
    description: "Contact details, map and form.",
    icon: "mail",
    dataSource: "Contact settings + Forms",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "localizedText" },
      { name: "title", label: "Title", type: "localizedText" },
      { name: "subtitle", label: "Subtitle", type: "localizedTextarea" },
      { name: "showDetails", label: "Show contact details", type: "boolean" },
      { name: "showHours", label: "Show opening hours", type: "boolean" },
      { name: "showMap", label: "Show map", type: "boolean" },
      { name: "showForm", label: "Show form", type: "boolean" },
      { name: "formSlug", label: "Form to display", type: "text", help: "Slug of a form created in Admin → Forms (default: contact).", showWhen: { field: "showForm", equals: true } },
    ],
    defaults: {
      eyebrow: { en: "Contact", fr: "Contact", ar: "اتصل بنا" },
      title: { en: "Come and see the centre", fr: "Venez visiter le centre", ar: "تفضّل بزيارة المركز" },
      subtitle: {
        en: "Send us a message, or come by during opening hours — we will show you the classrooms and the exam rooms.",
        fr: "Envoyez-nous un message ou passez pendant les horaires d'ouverture : nous vous montrerons les salles de cours et d'examen.",
        ar: "أرسل لنا رسالة أو زرنا خلال ساعات العمل، وسنُطلعك على قاعات الدراسة والامتحان.",
      },
      showDetails: true,
      showHours: true,
      showMap: true,
      showForm: true,
      formSlug: "contact",
    },
  },
  {
    type: "richText",
    label: "Rich text",
    description: "A free block of formatted text.",
    icon: "text",
    fields: [
      { name: "title", label: "Title", type: "localizedText" },
      { name: "body", label: "Body", type: "localizedRichText" },
      { name: "width", label: "Width", type: "select", options: [{ value: "narrow", label: "Narrow" }, { value: "wide", label: "Wide" }] },
    ],
    defaults: {
      title: { en: "Section title", fr: "Titre de section", ar: "عنوان القسم" },
      body: { en: "<p>Write your content here.</p>", fr: "<p>Écrivez votre contenu ici.</p>", ar: "<p>اكتب المحتوى هنا.</p>" },
      width: "narrow",
    },
  },
  {
    type: "featureGrid",
    label: "Feature grid",
    description: "A flexible grid of icon cards you write yourself.",
    icon: "layers",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "localizedText" },
      { name: "title", label: "Title", type: "localizedText" },
      { name: "subtitle", label: "Subtitle", type: "localizedTextarea" },
      {
        name: "items",
        label: "Cards",
        type: "repeater",
        itemLabelField: "title",
        addLabel: "Add card",
        fields: [
          { name: "title", label: "Title", type: "localizedText" },
          { name: "description", label: "Description", type: "localizedTextarea" },
          { name: "icon", label: "Icon", type: "select", options: iconOptions() },
          { name: "href", label: "Link", type: "link" },
        ],
      },
      { name: "columns", label: "Columns", type: "select", options: [{ value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }] },
    ],
    defaults: {
      eyebrow: { en: "", fr: "", ar: "" },
      title: { en: "Why choose us", fr: "Pourquoi nous choisir", ar: "لماذا نحن" },
      subtitle: { en: "", fr: "", ar: "" },
      items: [
        { title: { en: "Level-accurate placement", fr: "Placement précis", ar: "تحديد دقيق للمستوى" }, description: { en: "You start where you actually are, not where a generic test says you are.", fr: "Vous commencez à votre vrai niveau, pas à celui d'un test générique.", ar: "تبدأ من مستواك الحقيقي لا من نتيجة اختبار عام." }, icon: "target", href: "" },
        { title: { en: "Feedback you can act on", fr: "Des retours exploitables", ar: "ملاحظات قابلة للتطبيق" }, description: { en: "Every corrected paper comes back with two things to fix before the next one.", fr: "Chaque copie corrigée revient avec deux points à corriger avant la suivante.", ar: "كل ورقة مصححة تعود بنقطتين للتحسين قبل التالية." }, icon: "pen", href: "" },
        { title: { en: "Exam-day realism", fr: "Réalisme du jour J", ar: "واقعية يوم الامتحان" }, description: { en: "Mock tests are sat in the same rooms, at the same times, with the same rules.", fr: "Les examens blancs se passent dans les mêmes salles, aux mêmes horaires, avec les mêmes règles.", ar: "الاختبارات التجريبية في القاعات نفسها وبالتوقيت والقواعد ذاتها." }, icon: "clipboard", href: "" },
      ],
      columns: "3",
    },
  },
  {
    type: "steps",
    label: "Process steps",
    description: "A numbered, animated path (admissions, exam registration…).",
    icon: "list",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "localizedText" },
      { name: "title", label: "Title", type: "localizedText" },
      { name: "subtitle", label: "Subtitle", type: "localizedTextarea" },
      {
        name: "steps",
        label: "Steps",
        type: "repeater",
        itemLabelField: "title",
        addLabel: "Add step",
        fields: [
          { name: "title", label: "Title", type: "localizedText" },
          { name: "description", label: "Description", type: "localizedTextarea" },
        ],
      },
    ],
    defaults: {
      eyebrow: { en: "How it works", fr: "Comment ça marche", ar: "كيف تسير الأمور" },
      title: { en: "From first contact to results day", fr: "Du premier contact au jour des résultats", ar: "من أول تواصل إلى يوم النتائج" },
      subtitle: { en: "", fr: "", ar: "" },
      steps: [
        { title: { en: "Placement assessment", fr: "Test de niveau", ar: "اختبار تحديد المستوى" }, description: { en: "A short written and spoken assessment to find your real starting band.", fr: "Une évaluation écrite et orale courte pour situer votre niveau réel.", ar: "تقييم قصير كتابي وشفوي لتحديد مستواك الحقيقي." } },
        { title: { en: "Study plan", fr: "Plan d'étude", ar: "خطة الدراسة" }, description: { en: "We agree a target band, a timeline and the group that fits your schedule.", fr: "Nous fixons ensemble un score cible, un calendrier et le groupe adapté à votre emploi du temps.", ar: "نتفق على الدرجة المستهدفة والجدول الزمني والمجموعة المناسبة." } },
        { title: { en: "Preparation & mocks", fr: "Préparation et examens blancs", ar: "التحضير والاختبارات التجريبية" }, description: { en: "Weekly classes, corrected work and full mock tests in exam conditions.", fr: "Cours hebdomadaires, travaux corrigés et examens blancs en conditions réelles.", ar: "حصص أسبوعية وأعمال مصححة واختبارات كاملة في ظروف الامتحان." } },
        { title: { en: "Registration & exam", fr: "Inscription et examen", ar: "التسجيل والامتحان" }, description: { en: "We walk you through registration and you sit the exam in a room you already know.", fr: "Nous vous accompagnons dans l'inscription et vous passez l'examen dans une salle déjà familière.", ar: "نرافقك في التسجيل وتؤدي الامتحان في قاعة تعرفها مسبقًا." } },
      ],
    },
  },
];

function iconOptions(): FieldOption[] {
  return [
    { value: "star", label: "Star" },
    { value: "award", label: "Award" },
    { value: "book", label: "Book" },
    { value: "globe", label: "Globe" },
    { value: "users", label: "Users" },
    { value: "shield", label: "Shield" },
    { value: "target", label: "Target" },
    { value: "chart", label: "Chart" },
    { value: "pen", label: "Pen" },
    { value: "mic", label: "Microphone" },
    { value: "headphones", label: "Headphones" },
    { value: "clipboard", label: "Clipboard" },
    { value: "graduation", label: "Graduation cap" },
    { value: "heart", label: "Heart" },
    { value: "sparkles", label: "Sparkles" },
    { value: "building", label: "Building" },
    { value: "compass", label: "Compass" },
    { value: "clock", label: "Clock" },
  ];
}

export const SECTION_TYPE_MAP: Record<string, SectionTypeDefinition> = Object.fromEntries(
  SECTION_TYPES.map((definition) => [definition.type, definition]),
);

export function getSectionType(type: string): SectionTypeDefinition | undefined {
  return SECTION_TYPE_MAP[type];
}

export function defaultsForType(type: string): Record<string, unknown> {
  return structuredClone(SECTION_TYPE_MAP[type]?.defaults ?? {});
}

export const ICON_NAMES = iconOptions().map((option) => option.value);
