import sequelize from '../db.js';
import { Program } from '../models/index.js';
import { buildUniqueSlug } from '../utils/slug.js';

// The four programs She Shape runs today. Prices and times are placeholders
// for the admin to correct in the dashboard.
const PROGRAMS = [
  {
    name: 'She Strong Classes',
    label: 'Signature',
    tagline: 'Coached strength classes for women, every level welcome.',
    description:
      'Our flagship strength classes: progressive, coached and welcoming whether it is your first time under a barbell or your hundredth. Every session is built for real life, whatever your starting point.\n\nYou train in a group of women led by a coach who learns your name, your goals and your limits, and progresses you week by week.',
    highlights: ['All levels welcome', 'Progressive strength coaching', 'In person at Fitnesspoint, Kigali'],
    status: 'open',
    price: 45000,
    priceNote: 'per month',
    duration: 'Ongoing · 3 sessions a week',
    location: 'Fitnesspoint Kimihurura',
    coach: 'Coach Arnoldine',
    capacity: 15,
    schedule: [
      { day: 'Monday', time: '06:30 – 07:30', note: 'Fitnesspoint Kimihurura' },
      { day: 'Wednesday', time: '06:30 – 07:30', note: 'Fitnesspoint Kimihurura' },
      { day: 'Saturday', time: '08:00 – 09:00', note: 'Fitnesspoint Remera' }
    ],
    sortOrder: 0,
  },
  {
    name: 'She Strong Challenge',
    label: 'Group training',
    tagline: 'Twelve weeks, five women, one goal.',
    description:
      'A 12-week group program for a maximum of five women, built to create momentum, consistency and results-oriented training that helps you reach your body goals.\n\nSmall on purpose: you get coaching attention, accountability from the group, and a plan that adapts to you.',
    highlights: ['12 weeks, max 5 women', 'Momentum and consistency focused', 'Results-oriented programming'],
    status: 'open',
    price: 180000,
    priceNote: 'for 12 weeks',
    duration: '12 weeks · 3 sessions a week',
    location: 'Fitnesspoint Remera',
    coach: 'Coach Ninette',
    capacity: 5,
    schedule: [
      { day: 'Tuesday', time: '17:30 – 18:30', note: 'Fitnesspoint Remera' },
      { day: 'Thursday', time: '17:30 – 18:30', note: 'Fitnesspoint Remera' },
      { day: 'Saturday', time: '09:30 – 10:30', note: 'Fitnesspoint Remera' }
    ],
    sortOrder: 1,
  },
  {
    name: 'Corporate Workshops',
    label: 'For teams',
    tagline: 'Fitness and wellness sessions at your workplace.',
    description:
      'On-site employee workouts, body composition assessments and expert education on evidence-based fitness, wellness, nutrition and health. Built for companies that want their teams to feel good at work.',
    highlights: ['On-site employee workouts', 'Body composition assessments', 'Expert, evidence-based education'],
    status: 'open',
    price: null,
    priceNote: '',
    duration: 'Half-day or recurring',
    location: 'At your office, Kigali',
    coach: '',
    capacity: null,
    schedule: [],
    sortOrder: 2,
  },
  {
    name: 'Wellness Events',
    label: 'Events',
    tagline: 'Retreats, bootcamps and community days.',
    description:
      'Seasonal retreats, bootcamps and community days that bring the She Shape community together to move, learn and recharge.',
    highlights: ['Seasonal retreats and bootcamps', 'Community days', 'Open to members and newcomers'],
    status: 'coming_soon',
    price: null,
    priceNote: '',
    duration: '',
    location: 'Kigali and beyond',
    coach: '',
    capacity: null,
    schedule: [],
    sortOrder: 3,
  },
];

async function run() {
  try {
    await sequelize.authenticate();

    for (const entry of PROGRAMS) {
      const existing = await Program.findOne({ where: { name: entry.name } });

      if (existing) {
        await existing.update(entry);
        console.log('updated ', entry.name);
        continue;
      }

      const slug = await buildUniqueSlug(Program, entry.name);
      await Program.create({ ...entry, slug });
      console.log('created ', entry.name);
    }

    console.log(`\n${PROGRAMS.length} programs in place.`);
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
}

run();
