import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { Program, ProgramVideo } from '../models/index.js';

export const PUBLIC_PROGRAM_FIELDS = [
  'id', 'name', 'slug', 'tagline', 'label', 'highlights', 'description', 'coverImage', 'status',
  'price', 'priceNote', 'duration', 'location', 'coach', 'capacity', 'schedule', 'bookable', 'sortOrder',
];

const withVideos = {
  model: ProgramVideo,
  as: 'videos',
  attributes: ['id', 'title', 'url', 'sortOrder'],
  separate: true,
  order: [['sortOrder', 'ASC']],
};

export const list = asyncHandler(async (req, res) => {
  const data = await Program.findAll({
    attributes: PUBLIC_PROGRAM_FIELDS,
    order: [
      ['sortOrder', 'ASC'],
      ['name', 'ASC'],
    ],
  });

  res.json({ data });
});

export const detail = asyncHandler(async (req, res) => {
  const program = await Program.findOne({
    where: { slug: req.params.slug },
    attributes: PUBLIC_PROGRAM_FIELDS,
    include: [withVideos],
  });

  if (!program) throw new HttpError(404, 'Program not found');

  res.json({ data: program });
});
