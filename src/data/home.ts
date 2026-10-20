export const introduction = {
  role: '浙大本硕，电力电子在读',
  text: '扈江离与辟芷兮，纫秋兰以为佩',
};

export interface Soundtrack {
  id: string;
  title: string;
  version: string;
  src: string;
  credit?: { artist: string; source: string; license: string; licenseUrl: string };
}

export const soundtracks: Soundtrack[] = [
  {
    id: 'beneath-the-mask-rain',
    title: 'Beneath the Mask',
    version: 'Rain version',
    src: 'audio/beneath-the-mask-rain.mp3',
  },
  {
    id: 'life-will-change',
    title: 'Life Will Change',
    version: 'Persona 5 OST',
    src: 'audio/life-will-change.mp3',
  },
  {
    id: 'tokyo-daylight',
    title: 'Tokyo Daylight',
    version: 'Persona 5 OST',
    src: 'audio/tokyo-daylight.mp3',
  },
  {
    id: 'ark',
    title: 'Ark',
    version: 'Persona 5 OST',
    src: 'audio/ark.mp3',
  },
  {
    id: 'rivers-in-the-desert',
    title: 'Rivers in the Desert',
    version: 'Persona 5 OST',
    src: 'audio/rivers-in-the-desert.mp3',
  },
];
