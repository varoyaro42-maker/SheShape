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
    title: "Together, we are making women's wellness",
    script: 'a movement.',
    paragraph:
      "Join our women's health, fitness and wellness platform on a mission to build stronger, healthier lives for women and their communities through movement, prevention, science-based information and community.",
    primaryButtonLabel: 'See programs',
    secondaryButtonLabel: 'Shop the She Strong tee',
    imageUrl: '',
    // Slideshow photos: [{ imageUrl, label, caption }]. Shown when there is no video.
    slides: [
      { imageUrl: '/media/instagram/community-grows.jpg', label: 'She Strong Classes', caption: 'The community keeps growing' },
      { imageUrl: '/media/instagram/she-strong-class.jpg', label: 'On the floor', caption: 'Strength, coached and shared' },
      { imageUrl: '/media/instagram/launch-audience.jpg', label: 'Launch night', caption: "International Women's Day 2026" }
    ],
    // A landing video takes over from the photos when set. 16:9 MP4 works best.
    // The brand film ships with the site (frontend/public/media/landing).
    videoUrl: '/media/landing/she-shape-online-1080p.mp4',
    // Lighter (720p) copy served to phones.
    videoSmallUrl: '/media/landing/she-shape-online-720p.mp4',
    videoPoster: '/media/landing/poster.jpg',
    videoTitle: 'She Shape Online',
    // Admin switches: hide the video without deleting it, and allow sound or keep it silent.
    videoEnabled: true,
    videoSound: true
  },
  // Logos of organisations that back She Shape Wellness: [{ name, imageUrl, href }]
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
    eyebrow: 'By She Shape Wellness × Shield Activewear',
    heading: 'SHE STRONG CROP T-SHIRTS',
    script: 'more than a T-shirt',
    paragraph:
      'Designed for the women who make up our community. A statement that you show up for yourself, move your body and get stronger together. Crop fit, five colours, 25,000 RWF.',
    tags: ['White', 'Black', 'Steel blue', 'Navy', 'Sage green'],
    buttonLabel: 'Shop the tee'
  },
  program: {
    eyebrow: 'Featured program',
    buttonLabel: 'Ask to join'
  },
  app: {
    enabled: true,
    eyebrow: 'She Shape Wellness App',
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
    items: ['Learn', 'Grow', 'Thrive', 'She Strong Classes', 'Kigali', 'She Strong', 'Women only']
  },
  // Photo strip linking to Instagram: [{ imageUrl, caption, href }]
  // Photos from @sheshape_wellness, each linking to its post.
  gallery: [
    { imageUrl: '/media/instagram/community-grows.jpg', caption: 'The community keeps growing', href: 'https://www.instagram.com/p/DU5hqdHDI6f/' },
    { imageUrl: '/media/instagram/pedal-for-a-purpose.jpg', caption: 'Pedal for a Purpose · Breast Cancer Awareness Month', href: 'https://www.instagram.com/p/Dely8ZrDoRE/' },
    { imageUrl: '/media/instagram/she-strong-class.jpg', caption: 'She Strong class, Kigali', href: 'https://www.instagram.com/p/DOjLRcPjMPL/' },
    { imageUrl: '/media/instagram/she-strong-tee.jpg', caption: 'The She Strong tee', href: 'https://www.instagram.com/p/DeMazMTDtb4/' },
    { imageUrl: '/media/instagram/launch-audience.jpg', caption: "Official launch, International Women's Day", href: 'https://www.instagram.com/p/DV3RO7tDGyu/' },
    { imageUrl: '/media/instagram/body-composition-day.jpg', caption: 'Body composition check day', href: 'https://www.instagram.com/p/DZ0ItR8sWC2/' },
    { imageUrl: '/media/instagram/launch-panel.jpg', caption: "Launch panel on women's health and fitness", href: 'https://www.instagram.com/p/DV1Q5jejIbY/' },
    { imageUrl: '/media/instagram/community-session.jpg', caption: 'Community session', href: 'https://www.instagram.com/p/DIEINH-Mylk/' }
  ],
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
      'She Shape Wellness helps women in Rwanda feel strong, capable and confident through structured training, honest nutrition guidance and a community that shows up for each other.',
    imageUrl: '/media/instagram/community-session.jpg'
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
