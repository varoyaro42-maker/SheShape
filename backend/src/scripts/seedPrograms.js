import sequelize from '../db.js';
import { Program } from '../models/index.js';
import { buildUniqueSlug } from '../utils/slug.js';

const PROGRAMS = [
  {
    name: 'She Strong Classes',
    label: 'Signature',
    tagline: 'Our flagship strength classes for women.',
    description:
      'Our flagship strength classes for women — progressive, coached, and welcoming at every level. Every session is built for real life, whatever your starting point.',
    highlights: [
      'All levels welcome',
      'Progressive strength coaching',
      'In-person in Kigali',
    ],
    sortOrder: 0,
  },
  {
    name: 'She Strong Challenge',
    label: 'Group training',
    tagline: 'A 12-week group training for a maximum of five women.',
    description:
      'A 12-week group training for a maximum of five women — built to create momentum, consistency, and results-oriented workouts that help you achieve your body goals.',
    highlights: [
      '12 weeks, max 5 women',
      'Momentum and consistency focused',
      'Results-oriented programming',
    ],
    sortOrder: 1,
  },
  {
    name: 'Corporate Workshops',
    label: 'For teams',
    tagline: 'Fitness and wellness workshops for employees.',
    description:
      'Fitness and wellness workshops for employees — including on-site employee workouts, body composition assessments, and expert education on evidence-based fitness, wellness, nutrition and health.',
    highlights: [
      'On-site employee workouts',
      'Body composition assessments',
      'Expert, evidence-based education',
    ],
    sortOrder: 2,
  },
  {
    name: 'Wellness Events',
    label: 'Events',
    tagline: 'Retreats, bootcamps and community days.',
    description:
      'Retreats, bootcamps, and community days that bring women together to move and learn. Seasonal, open to everyone, and built around the same coaching that runs through everything we do.',
    highlights: [
      'Seasonal retreats and bootcamps',
      'Guest coaches and speakers',
      'Open to all women',
    ],
    sortOrder: 3,
  },
];

async function run() {
  await sequelize.authenticate();

  await sequelize.transaction(async (transaction) => {
    for (const entry of PROGRAMS) {
      const existing = await Program.findOne({
        where: { name: entry.name },
        transaction,
      });

      if (existing) {
        await existing.update(entry, { transaction });
        console.log(`updated  ${entry.name}`);
        continue;
      }

      const slug = await buildUniqueSlug(Program, entry.name, { transaction });
      await Program.create({ ...entry, slug }, { transaction });
      console.log(`created  ${entry.name}`);
    }
  });

  console.log(`\n${PROGRAMS.length} programs in place.`);
  await sequelize.close();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
