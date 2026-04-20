import type { WordNode } from '../types'

const CAYTUVUNG_LOGO = new URL('../../logo.png', import.meta.url).href

export const VOCABULARY_WORDS: WordNode[] = [
  {
    id: 'caytuvung-platform',
    word: 'caytuvung.site',
    meaning: 'Open the full Cay Tu Vung learning platform.',
    example: 'Select this item to continue on the live learning website.',
    pronunciation: '/keɪ-tu-vʌŋ-saɪt/',
    icon: 'CV',
    iconImageSrc: CAYTUVUNG_LOGO,
    launchUrl: 'https://caytuvung.site',
  },
  {
    id: 'quantum',
    word: 'Quantum',
    meaning: 'A minimum discrete unit in physics or information.',
    example: 'Quantum processors can explore many states simultaneously.',
    pronunciation: '/ˈkwɒn.təm/',
    icon: 'Q',
  },
  {
    id: 'synthesize',
    word: 'Synthesize',
    meaning: 'To combine ideas or data into a coherent whole.',
    example: 'The AI can synthesize research notes into a clear strategy.',
    pronunciation: '/ˈsɪn.θə.saɪz/',
    icon: 'S',
  },
  {
    id: 'resilient',
    word: 'Resilient',
    meaning: 'Able to recover quickly from stress or disruption.',
    example: 'A resilient learner adapts after every mistake.',
    pronunciation: '/rɪˈzɪl.jənt/',
    icon: 'R',
  },
  {
    id: 'iterate',
    word: 'Iterate',
    meaning: 'To refine through repeated cycles of improvement.',
    example: 'Great products iterate quickly based on feedback.',
    pronunciation: '/ˈɪt.ə.reɪt/',
    icon: 'I',
  },
  {
    id: 'adaptive',
    word: 'Adaptive',
    meaning: 'Capable of adjusting to new conditions efficiently.',
    example: 'An adaptive system personalizes lessons in real time.',
    pronunciation: '/əˈdæp.tɪv/',
    icon: 'A',
  },
  {
    id: 'clarity',
    word: 'Clarity',
    meaning: 'The quality of being clear and easy to understand.',
    example: 'Clarity in vocabulary leads to stronger communication.',
    pronunciation: '/ˈklær.ə.ti/',
    icon: 'C',
  },
]
