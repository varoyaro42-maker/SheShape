import { sequelize, Product, ProductImage, Category } from '../models/index.js'
import { buildUniqueSlug } from '../utils/slug.js'

const CATEGORIES = [{ name: 'Activewear', slug: 'activewear' }]

// The shop sells the She Strong crop tee; its photos ship with the site in
// frontend/public/media/shop so no upload is needed.
const products = [
  {
    name: 'She Strong Crop T-shirt',
    description:
      'More than a T-shirt: a statement that she is strong. Designed by She Shape with Shield Activewear for the women in our community. A soft, fitted crop tee with the she strong print across the chest and the She Strong mark at the back. Five colours: white, black, steel blue, navy and sage green.',
    price: 25000,
    category: 'activewear',
    stock: 50,
    // Portrait photo first: it fills the promo frame and product cards without cropping.
    images: [
      { url: '/media/shop/she-strong-tee-black.jpg', color: 'Black', colorHex: '#111111' },
      { url: '/media/shop/she-strong-tee-colours.jpg' },
      { url: '/media/shop/she-strong-tee-navy.jpg', color: 'Navy', colorHex: '#1f2a44' }
    ]
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
        item.images.map((image, index) => ({
          productId: created.id,
          url: image.url,
          color: image.color ?? null,
          colorHex: image.colorHex ?? null,
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
