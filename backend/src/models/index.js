import { sequelize } from '../db.js'
import User from './User.js'
import { Product } from './Product.js'
import { Category } from './Category.js'
import { ProductImage } from './ProductImage.js'
import Order, { ORDER_STATUSES } from './Order.js'
import OrderItem from './OrderItem.js'
import Post from './Post.js'
import Program, { PROGRAM_STATUSES } from './Program.js'
import ProgramVideo from './ProgramVideo.js'
import OtpCode, { OTP_PURPOSES } from './OtpCode.js'
import PaymentSettings from './PaymentSettings.js'
import HomeContent from './HomeContent.js'
import ContactMessage, { MESSAGE_STATUSES } from './ContactMessage.js'

Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' })
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' })

Product.hasMany(ProductImage, {
  as: 'images',
  foreignKey: { name: 'productId', allowNull: false },
  onDelete: 'CASCADE',
  hooks: true
})

ProductImage.belongsTo(Product, {
  as: 'product',
  foreignKey: { name: 'productId', allowNull: false }
})

User.hasMany(Order, { foreignKey: 'userId', as: 'orders', onDelete: 'SET NULL' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'SET NULL' });

Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product', onDelete: 'SET NULL' });

User.hasMany(Post, { foreignKey: 'authorId', as: 'posts' })
Post.belongsTo(User, { foreignKey: 'authorId', as: 'author', onDelete: 'SET NULL' })

User.hasMany(OtpCode, { foreignKey: 'userId', as: 'otpCodes', onDelete: 'CASCADE' })
OtpCode.belongsTo(User, { foreignKey: 'userId', as: 'user' })

Program.hasMany(ProgramVideo, {
  as: 'videos',
  foreignKey: { name: 'programId', allowNull: false },
  onDelete: 'CASCADE',
  hooks: true
})
ProgramVideo.belongsTo(Program, { as: 'program', foreignKey: { name: 'programId', allowNull: false } })

User.hasMany(ContactMessage, { foreignKey: 'repliedById', as: 'repliedMessages', onDelete: 'SET NULL' })
ContactMessage.belongsTo(User, { foreignKey: 'repliedById', as: 'repliedBy', onDelete: 'SET NULL' })

export {
  sequelize,
  User,
  Product,
  Category,
  ProductImage,
  Order,
  OrderItem,
  Post,
  Program,
  ProgramVideo,
  OtpCode,
  PaymentSettings,
  HomeContent,
  ContactMessage,
  ORDER_STATUSES,
  PROGRAM_STATUSES,
  OTP_PURPOSES,
  MESSAGE_STATUSES
}
