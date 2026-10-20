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
    id: 'night-on-the-docks-sax',
    title: 'Night on the Docks',
    version: 'Sax version',
    src: 'audio/night-on-the-docks-sax.mp3',
    credit: { artist: 'Kevin MacLeod', source: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100137', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' },
  },
  {
    id: 'george-street-shuffle',
    title: 'George Street Shuffle',
    version: 'Light jazz',
    src: 'audio/george-street-shuffle.mp3',
    credit: { artist: 'Kevin MacLeod', source: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1300035', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' },
  },
  {
    id: 'airport-lounge',
    title: 'Airport Lounge',
    version: 'Lounge jazz',
    src: 'audio/airport-lounge.mp3',
    credit: { artist: 'Kevin MacLeod', source: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100806', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' },
  },
];
