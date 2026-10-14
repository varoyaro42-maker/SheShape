import { sequelize, Product, ProductImage, Category } from '../models/index.js'
import { buildUniqueSlug } from '../utils/slug.js'

const CATEGORIES = [
  { name: 'Activewear', slug: 'activewear' },
  { name: 'Accessories', slug: 'accessories' },
  { name: 'Supplements', slug: 'supplements' },
  { name: 'Journals', slug: 'journals' }
]

const products = [
  {
    name: 'She Shape Performance Leggings',
    description: 'High-waisted squat-proof leggings in a four-way stretch fabric with a hidden waistband pocket.',
    price: 38000,
    category: 'activewear',
    stock: 24,
    images: [
      'https://picsum.photos/seed/sheshape-leggings-1/900/900',
      'https://picsum.photos/seed/sheshape-leggings-2/900/900'
    ]
  },
  {
    name: 'She Shape Sports Bra',
    description: 'Medium-support sports bra with removable pads and a racerback cut for full shoulder movement.',
    price: 25000,
    category: 'activewear',
    stock: 30,
    images: ['https://picsum.photos/seed/sheshape-bra-1/900/900']
  },
  {
    name: 'She Shape Gym Bag',
    description: 'Water-resistant duffel with a separate shoe compartment and a padded shoulder strap.',
    price: 45000,
    category: 'accessories',
    stock: 12,
    images: [
      'https://picsum.photos/seed/sheshape-bag-1/900/900',
      'https://picsum.photos/seed/sheshape-bag-2/900/900'
    ]
  },
  {
    name: 'She Shape Whey Protein 1kg',
    description: 'Twenty-four grams of protein per serving, vanilla flavour, thirty servings per tub.',
    price: 52000,
    category: 'supplements',
    stock: 18,
    images: ['https://picsum.photos/seed/sheshape-protein-1/900/900']
  },
  {
    name: 'She Shape Training Journal',
    description: 'Twelve-week hardcover journal for logging workouts, weights and progress photos.',
    price: 15000,
    category: 'journals',
    stock: 3,
    images: ['https://picsum.photos/seed/sheshape-journal-1/900/900']
  }
]

async function run() {
  const transaction = await sequelize.transaction()

  try {
    await ProductImage.destroy({ where: {}, transaction })
    await Product.destroy({ where: {}, transaction })

    const categoryIds = {}
    for (const entry of CATEGORIES) {
      const [category] = await Category.findOrCreate({
        where: { slug: entry.slug },
        defaults: entry,
        transaction
      })
      categoryIds[entry.slug] = category.id
    }

    for (const item of products) {
      const slug = await buildUniqueSlug(Product, item.name, { transaction })

      const created = await Product.create({
        name: item.name,
        slug,
        description: item.description,
        price: item.price,
        categoryId: categoryIds[item.category],
        stock: item.stock,
        isPublished: true
      }, { transaction })

      await ProductImage.bulkCreate(
        item.images.map((url, index) => ({
          productId: created.id,
          url,
          sortOrder: index
        })),
        { transaction }
      )
    }

    await transaction.commit()
    console.log(`Seeded ${CATEGORIES.length} categories and ${products.length} products`)
    process.exit(0)
  } catch (error) {
    await transaction.rollback()
    console.error('Seed failed:', error.message)
    process.exit(1)
  }
}

run()
