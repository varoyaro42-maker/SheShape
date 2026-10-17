import { HomeContent } from '../models/index.js'

const SETTINGS_ID = 1

/**
 * Editable marketing content, stored as one JSON document. Every key here is
 * a default; the admin "Home page" screen overrides any of them. Arrays are
 * replaced wholesale, so an empty list hides that section on the site.
 */
export const DEFAULT_HOME_CONTENT = {
  hero: {
    eyebrow: 'Kigali · Rwanda',
    title: "Together, we're making women's wellness",
    script: 'a movement.',
    paragraph:
      "Join our women's health, fitness and wellness platform on a mission to build stronger, healthier lives for women and their communities through movement, prevention, science-based information and community.",
    primaryButtonLabel: 'See programs',
    secondaryButtonLabel: 'Shop Nkondo Active',
    imageUrl: '',
    // Slideshow photos: [{ imageUrl, label, caption }]. Falls back to imageUrl when empty.
    slides: [],
    // A landing video takes over from the photos when set. 16:9 MP4 works best.
    // The brand film ships with the site (frontend/public/media/landing).
    videoUrl: '/media/landing/she-shape-online-1080p.mp4',
    // Lighter (720p) copy served to phones.
    videoSmallUrl: '/media/landing/she-shape-online-720p.mp4',
    videoPoster: '/media/landing/poster.jpg',
    videoTitle: 'She Shape Online'
  },
  // Logos of organisations that back She Shape: [{ name, imageUrl, href }]
  partners: [
    { name: 'Fitnesspoint', imageUrl: '/partners/fitnesspoint.png', href: '' },
    { name: 'Vitaway', imageUrl: '/partners/vitaway.png', href: '' }
  ],
  stats: [
    { value: '250+', label: 'women in the community' },
    { value: '4', label: 'Fitnesspoint gyms across Kigali' },
    { value: '2026', label: "launched on International Women's Day" }
  ],
  featured: {
    eyebrow: 'By She Shape · Activewear',
    heading: 'NKONDO ACTIVE',
    script: 'made to move with you',
    paragraph:
      'Gym clothes, training accessories and nutrition products designed for women who move. Comfort, support and quality that keeps up with every session.',
    tags: ['Gym clothes', 'Accessories', 'Nutrition products'],
    buttonLabel: 'Shop Nkondo Active'
  },
  program: {
    eyebrow: 'Featured program',
    buttonLabel: 'Ask to join'
  },
  app: {
    enabled: true,
    eyebrow: 'She Shape App',
    heading: 'Your coach, in your pocket',
    script: '',
    paragraph:
      'Enroll in programs, follow guided sessions, and track your workouts and body composition in one place. The app is in preview; try the prototype.',
    features: [
      'Guided workout player with timer',
      'Health and body-composition tracking',
      'Programs by Coach Arnoldine and Coach Ninette'
    ],
    imageUrl: '',
    demoUrl: '/app-demo.html',
    demoLabel: 'Try the prototype'
  },
  // Scrolling band of short words under the hero.
  ticker: {
    // Off by request; switch it on under Site content → Hero.
    enabled: false,
    items: ['Learn', 'Grow', 'Thrive', 'She Strong Classes', 'Kigali', 'Nkondo Active', 'Women only']
  },
  // Photo strip linking to Instagram: [{ imageUrl, caption, href }]
  gallery: [],
  tips: [
    {
      title: "Lifting won't make you bulky.",
      body: "Women don't have the testosterone to bulk up easily. What you build is lean strength, stronger bones and a faster metabolism."
    },
    {
      title: "You can't spot-reduce fat.",
      body: 'Crunches build the muscle underneath, but fat loss happens across your whole body. Full-body strength and steady habits show results faster.'
    },
    {
      title: 'Rest days are training days.',
      body: 'Muscle is built between sessions, not during them. Two rest days a week keep you progressing without burning out.'
    }
  ],
  testimonials: [],
  team: [],
  about: {
    heading: 'Fitness made for women. Practical, not punishing.',
    paragraph:
      'She Shape helps women in Rwanda feel strong, capable and confident through structured training, honest nutrition guidance and a community that shows up for each other.',
    imageUrl: ''
  },
  contact: {
    phone: '',
    email: '',
    whatsapp: '',
    instagram: '@sheshape_wellness',
    address: ''
  },
  newsletter: {
    enabled: true,
    heading: 'Tips, workouts and early access to new programs.',
    paragraph: 'One email a week at most. Unsubscribe any time.'
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
