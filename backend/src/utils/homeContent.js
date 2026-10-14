import { HomeContent } from '../models/index.js'

const SETTINGS_ID = 1

export const DEFAULT_HOME_CONTENT = {
  hero: {
    eyebrow: 'Learn · Grow · Thrive',
    title: 'Strong is your shape.',
    script: "let's build it together.",
    paragraph:
      "Structured programs and gear designed for women who show up. Train with intention, build real strength, and order online — we'll get it to you.",
    primaryButtonLabel: 'Shop now',
    secondaryButtonLabel: 'Explore programs',
    imageUrl: ''
  },
  featured: {
    eyebrow: 'By She Shape · Activewear',
    heading: 'NKONDO ACTIVE',
    script: 'made to move with you',
    paragraph:
      'Gym clothes, training accessories, and nutrition products designed for women who move — comfort, support, and quality that keeps up with every session.',
    tags: ['Gym clothes', 'Accessories', 'Nutrition products'],
    buttonLabel: 'Shop now'
  },
  program: {
    eyebrow: 'featured',
    buttonLabel: 'Join the challenge'
  },
  app: {
    eyebrow: 'She Shape App',
    heading: 'Your coach, in your pocket',
    script: 'learn · grow · thrive',
    paragraph:
      'Enroll in programs, follow guided sessions, and track your progress — all in one place.',
    features: [
      'Guided workout player with timer',
      'Health & body-composition tracking',
      'Programs by Coach Arnoldine & Coach Ninette'
    ],
    imageUrl: ''
  },
  about: {
    heading: 'About She Shape',
    paragraph: '',
    imageUrl: ''
  },
  contact: {
    phone: '',
    email: '',
    whatsapp: '',
    instagram: '',
    address: ''
  }
}

function deepMerge(base, override) {
  if (Array.isArray(base)) return Array.isArray(override) ? override : base

  if (base && typeof base === 'object') {
    const result = { ...base }
    if (override && typeof override === 'object') {
      for (const key of Object.keys(base)) {
        if (override[key] !== undefined) {
          result[key] = deepMerge(base[key], override[key])
        }
      }
    }
    return result
  }

  return override !== undefined ? override : base
}

export async function getHomeContentRow() {
  const [row] = await HomeContent.findOrCreate({
    where: { id: SETTINGS_ID },
    defaults: { data: DEFAULT_HOME_CONTENT }
  })

  return row
}

export function withDefaults(data) {
  return deepMerge(DEFAULT_HOME_CONTENT, data ?? {})
}
