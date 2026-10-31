// Data keahlian — dipindah dari WebPortofolio lama (src/pages/About.tsx),
// dipakai halaman Tentang. Level dalam persen.
export type SkillCategory = "All" | "AI/ML" | "Web" | "Systems" | "Other";

export type Skill = {
  name: string;
  level: number;
  desc: { en: string; id: string };
  category: "AI/ML" | "Web" | "Systems" | "Other";
};

export const skillsData: Skill[] = [
  {
    name: "Python",
    level: 85,
    desc: {
      en: "Main language for scripting, automation, and data pipelines.",
      id: "Bahasa utama untuk scripting, otomatisasi, dan alur data."
    },
    category: "AI/ML"
  },
  {
    name: "PyTorch & ML",
    level: 75,
    desc: {
      en: "Model setup, fine-tuning, and working with embeddings.",
      id: "Setup model, fine-tuning, dan pengolahan embedding."
    },
    category: "AI/ML"
  },
  {
    name: "LangChain / RAG",
    level: 80,
    desc: {
      en: "Agent pipelines and knowledge retrieval over custom documents.",
      id: "Alur agen dan pencarian pengetahuan dari dokumen sendiri."
    },
    category: "AI/ML"
  },
  {
    name: "Gemini / OpenAI SDKs",
    level: 80,
    desc: {
      en: "Using Gemini and OpenAI models in real apps, including multimodal input.",
      id: "Memakai model Gemini dan OpenAI di aplikasi nyata, termasuk input multimodal."
    },
    category: "AI/ML"
  },

  {
    name: "TypeScript / JS",
    level: 75,
    desc: {
      en: "Type-safe code for web apps.",
      id: "Kode yang type-safe untuk aplikasi web."
    },
    category: "Web"
  },
  {
    name: "React",
    level: 80,
    desc: {
      en: "Frontends and dashboards with React.",
      id: "Frontend dan dasbor dengan React."
    },
    category: "Web"
  },
  {
    name: "Tailwind CSS",
    level: 65,
    desc: {
      en: "Responsive layouts and component styling.",
      id: "Layout responsif dan styling komponen."
    },
    category: "Web"
  },

  {
    name: "Linux Administration",
    level: 70,
    desc: {
      en: "Server setup, config, and day-to-day administration.",
      id: "Setup server, konfigurasi, dan administrasi harian."
    },
    category: "Systems"
  },
  {
    name: "Bash & Python Scripting",
    level: 80,
    desc: {
      en: "Automation scripts for routine tasks.",
      id: "Skrip otomatisasi untuk tugas rutin."
    },
    category: "Systems"
  },
  {
    name: "Docker Containers",
    level: 80,
    desc: {
      en: "Containerized apps for consistent deployments.",
      id: "Aplikasi dalam container agar deployment konsisten."
    },
    category: "Systems"
  },

  {
    name: "Flutter & Dart",
    level: 80,
    desc: {
      en: "Cross-platform mobile apps with Flutter.",
      id: "Aplikasi mobile lintas platform dengan Flutter."
    },
    category: "Other"
  },
  {
    name: "SQL & MongoDB",
    level: 75,
    desc: {
      en: "Relational and document databases for app storage.",
      id: "Database relasional dan dokumen untuk penyimpanan aplikasi."
    },
    category: "Other"
  }
]

