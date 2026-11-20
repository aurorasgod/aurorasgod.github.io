// Content of the academic page: English at /academic/ (the default) and Chinese at /academic/zh/.
// Every piece of text is written once per language as { en, zh }. The publication list comes from
// src/data/research.ts. Empty strings and empty arrays are left out of the page.

export type Lang = 'en' | 'zh';
type Text = { en: string; zh: string };

interface Entry {
  /** Main line, e.g. a school, a company or a project name. */
  title: Text;
  /** Second line, e.g. a degree or a role. */
  subtitle?: Text;
  /** Shown at the right, e.g. a year range. */
  period?: Text;
  details?: Text[];
  link?: { label: Text; href: string };
}

export const academic = {
  name: { en: 'Qimai Yan', zh: '严淇迈' },
  // The name in the other language, shown smaller beside the main one.
  alternateName: { en: '严淇迈', zh: 'Qimai Yan' },
  // A 4:5 portrait in public/. Left empty, the page shows no picture.
  photo: 'academic-photo.jpg',
  affiliation: { en: 'College of Electrical Engineering, Zhejiang University', zh: '浙江大学电气工程学院' },
  position: {
    en: 'Senior undergraduate in Electronic and Information Engineering; incoming M.S. student in power electronics',
    zh: '电子信息工程专业本科生（大四），已推免至本院攻读电力电子方向硕士研究生',
  },
  // Shown as a mailto link when filled in.
  email: '1269442069@qq.com',

  bio: [
    {
      en: 'I am a senior undergraduate in Electronic and Information Engineering at Zhejiang University. I have been admitted by recommendation to the master\'s program of the same college, where I will work on power electronics. I am currently an algorithm development intern at RoboParty.',
      zh: '我是严淇迈，浙江大学电子信息工程专业大四本科生，已获得推免资格，将在本院继续攻读电力电子方向的硕士研究生。目前在 RoboParty 从事算法开发实习。',
    },
    {
      en: 'My interests are embodied AI, power electronics control and agent applications. As an undergraduate I worked on robot motor control and a block-placement algorithm, DAB converters and PFC control. Recently I have been reading systematically on VLA and world models, and I publish my reading notes on my blog.',
      zh: '我的兴趣集中在具身智能、电力电子控制和 Agent 应用。本科期间做过机器人电控与方块摆放算法、DAB 变换器和 PFC 控制；近期在系统阅读 VLA 与世界模型方向的论文，并把阅读笔记整理成文章发布在个人博客上。',
    },
  ] as Text[],

  interests: [
    {
      area: { en: 'Embodied AI', zh: '具身智能' },
      topics: { en: 'Vision-language-action (VLA) models, world models, visual representation learning', zh: '视觉-语言-动作模型（VLA）、世界模型、视觉表征学习' },
    },
    {
      area: { en: 'Power electronics', zh: '电力电子' },
      topics: { en: 'Converter topologies and control, such as dual active bridge (DAB) converters and power factor correction (PFC)', zh: '变换器拓扑与控制，如双有源桥（DAB）变换器、功率因数校正（PFC）' },
    },
    {
      area: { en: 'Agent applications', zh: 'Agent 应用' },
      topics: { en: 'Tools for reading papers and keeping research records', zh: '面向论文阅读与研究记录的工具' },
    },
  ],

  education: [
    {
      title: { en: 'Zhejiang University', zh: '浙江大学' },
      subtitle: { en: 'M.S. in power electronics, admitted by recommendation', zh: '硕士研究生，电力电子方向' },
      period: { en: 'From 2027', zh: '2027 年入学（已推免）' },
      details: [
        { en: 'Advisor: Wenxi Yao', zh: '导师：姚文熙' },
        { en: 'Group: Prof. Wuhua Li\'s group (SEEED), Institute of Power Electronics', zh: '课题组：电力电子研究所 SEEED 李武华组' },
      ],
    },
    {
      title: { en: 'Zhejiang University', zh: '浙江大学' },
      subtitle: { en: 'B.Eng. in Electronic and Information Engineering', zh: '本科，电子信息工程' },
      period: { en: '2023 – 2027', zh: '2023 – 2027' },
      details: [
        { en: 'Edison Experimental Class, the college\'s honors program', zh: '入选爱迪生实验班（学院卓越人才培养计划）' },
        { en: 'Ranked 4th of 74 in the graduate recommendation assessment', zh: '推免综合排名 4/74' },
      ],
    },
  ] as Entry[],

  experience: [
    {
      title: { en: 'RoboParty', zh: 'RoboParty' },
      subtitle: { en: 'Algorithm development intern', zh: '算法开发实习生' },
      period: { en: 'Oct 2026 – present', zh: '2026 年 10 月 – 至今' },
    },
  ] as Entry[],

  awards: [
    {
      // The organiser publishes no English name; this is a direct translation.
      title: { en: 'National First Prize, China University Intelligent Robot Creative Competition', zh: '中国高校智能机器人创意大赛国家级一等奖' },
      period: { en: '2026', zh: '2026' },
    },
    {
      // English name as given in the competition's charter (EEEIC).
      title: { en: 'National Second Prize, Electrical & Electronic Engineering Innovation Competition', zh: '高校电气电子工程创新大赛国家级二等奖' },
      subtitle: { en: 'Team leader', zh: '担任队长' },
      period: { en: '2026', zh: '2026' },
    },
  ] as Entry[],

  projects: [
    {
      title: { en: 'JEPA world model research and real-robot deployment', zh: 'JEPA 世界模型研究与真机部署' },
      details: [{
        en: 'Training, ablation studies and visual-representation analysis of INTACT, a JEPA-based world model, on bimanual robot manipulation tasks, and work towards transferring it from simulation to a real robot.',
        zh: '基于 JEPA 架构的 INTACT 世界模型，在双臂机器人操作任务上开展训练、消融实验与视觉表征分析，并推进从仿真到真机的迁移部署。',
      }],
    },
    {
      title: { en: 'Robot motor control and block-placement algorithm', zh: '机器人电控与方块摆放算法' },
      details: [{ en: 'Built the robot\'s electrical control system and implemented its block-placement algorithm.', zh: '负责机器人的电控系统，并实现方块摆放算法。' }],
    },
    {
      title: { en: 'DAB converter and PFC control', zh: 'DAB 变换器与 PFC 控制' },
      details: [{ en: 'Control implementation for a dual active bridge (DAB) converter and for power factor correction (PFC).', zh: '双有源桥（DAB）变换器与功率因数校正（PFC）的控制实现。' }],
    },
  ] as Entry[],

  updated: { en: 'November 2026', zh: '2026 年 11 月' },
};

/** Fixed wording of the page itself. */
export const academicLabels = {
  pageTitle: { en: 'Academic homepage', zh: '学术主页' },
  tools: { en: 'Page tools', zh: '页面工具' },
  blog: { en: 'Blog (in Chinese)', zh: '个人博客' },
  print: { en: 'Print', zh: '打印本页' },
  photoAlt: { en: 'Portrait of', zh: '照片：' },
  interests: { en: 'Interests', zh: '研究兴趣' },
  publications: { en: 'Publications', zh: '论文与成果' },
  education: { en: 'Education', zh: '教育经历' },
  experience: { en: 'Experience', zh: '实习经历' },
  awards: { en: 'Awards', zh: '竞赛获奖' },
  projects: { en: 'Projects', zh: '项目经历' },
  updated: { en: 'Last updated', zh: '最后更新于' },
};

type Localized<T> = T extends Text ? string : T extends (infer Item)[] ? Localized<Item>[] : T extends object ? { [Key in keyof T]: Localized<T[Key]> } : T;

/** Replaces every { en, zh } pair in `value` with the text for `lang`. */
export function localize<T>(value: T, lang: Lang): Localized<T> {
  const pick = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(pick);
    if (node && typeof node === 'object') {
      const record = node as Record<string, unknown>;
      const keys = Object.keys(record);
      if (keys.length === 2 && typeof record.en === 'string' && typeof record.zh === 'string') return record[lang];
      return Object.fromEntries(keys.map(key => [key, pick(record[key])]));
    }
    return node;
  };
  return pick(value) as Localized<T>;
}
