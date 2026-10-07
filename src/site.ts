// Change public identity and links here. Empty links are omitted from the UI.
export const site = {
  title: "Laplace's Notes",
  chineseTitle: '研究笔记',
  author: 'Laplace',
  fullName: 'Qimai Yan',
  description: '具身智能、世界模型与电力电子。论文阅读、代码复现和学习记录。',
  github: 'https://github.com/aurorasgod',
  email: '',
};

export const categories = [
  { id: 'embodied-ai', name: '具身智能', en: 'Embodied AI', description: 'VLA、视觉表征与机器人学习。' },
  { id: 'world-model', name: '世界模型', en: 'World models', description: '预测、表征与环境建模。' },
  { id: 'power-electronics', name: '电力电子', en: 'Power electronics', description: '电路、控制与能量转换。' },
  { id: 'tools', name: '学习工具', en: 'Tools & practice', description: '笔记整理和阅读工作流。' },
];

export const categoryName = (id: string) => categories.find(c => c.id === id)?.name || id;
export const categoryEnglish = (id: string) => categories.find(c => c.id === id)?.en || id;
export const url = (path = '') => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
