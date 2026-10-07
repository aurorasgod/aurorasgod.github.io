// Change public identity and links here. Empty links are omitted from the UI.
export const site = {
  title: "Laplace's Notes",
  chineseTitle: 'Personal Blog',
  author: 'Laplace',
  fullName: 'Qimai Yan',
  description: 'Laplace / Qimai Yan 的个人博客。具身智能、电力电子与个人经历。',
  github: 'https://github.com/aurorasgod',
  email: '',
};

export const categories = [
  { id: 'embodied-ai', name: '具身智能', en: 'Embodied AI', description: 'VLA、视觉表征与机器人学习。' },
  { id: 'power-electronics', name: '电力电子', en: 'Power electronics', description: '电路、控制与能量转换。' },
  { id: 'personal', name: '个人经历', en: 'Personal stories', description: '日常、见闻与成长记录。' },
];

export const categoryName = (id: string) => categories.find(c => c.id === id)?.name || id;
export const categoryEnglish = (id: string) => categories.find(c => c.id === id)?.en || id;
export const url = (path = '') => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
