import { sequelize } from '../db.js'
import User from './User.js'
import { Product } from './Product.js'
import { Category } from './Category.js'
import { ProductImage } from './ProductImage.js'
import Order, { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_PROVIDERS } from './Order.js'
import OrderItem from './OrderItem.js'
import Post from './Post.js'
import Program, { PROGRAM_STATUSES } from './Program.js'
import ProgramVideo from './ProgramVideo.js'
import OtpCode, { OTP_PURPOSES } from './OtpCode.js'
import PaymentSettings, { XENTRIPAY_ENVIRONMENTS } from './PaymentSettings.js'
import HomeContent from './HomeContent.js'
import ContactMessage, { MESSAGE_STATUSES } from './ContactMessage.js'
import Subscriber, { SUBSCRIBER_STATUSES } from './Subscriber.js'
import Booking, { BOOKING_STATUSES } from './Booking.js'
import AdminInvite from './AdminInvite.js'
import Event, { EVENT_STATUSES, FEE_PAYERS, TICKET_FIELDS } from './Event.js'
import EventActivity from './EventActivity.js'
import EventQuestion, { QUESTION_TYPES } from './EventQuestion.js'
import EventRegistration, { REGISTRATION_STATUSES } from './EventRegistration.js'
import EventRegistrationActivity from './EventRegistrationActivity.js'
import Payout, { PAYOUT_STATUSES } from './Payout.js'
import AuditLog from './AuditLog.js'
import { installAuditHooks, useAuditModel } from '../utils/audit.js'

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

Program.hasMany(Booking, { foreignKey: 'programId', as: 'bookings', onDelete: 'SET NULL' })
Booking.belongsTo(Program, { foreignKey: 'programId', as: 'program', onDelete: 'SET NULL' })
User.hasMany(Booking, { foreignKey: 'userId', as: 'bookings', onDelete: 'SET NULL' })
Booking.belongsTo(User, { foreignKey: 'userId', as: 'user', onDelete: 'SET NULL' })
Booking.belongsTo(User, { foreignKey: 'respondedById', as: 'respondedBy', onDelete: 'SET NULL' })
AdminInvite.belongsTo(User, { foreignKey: 'invitedById', as: 'invitedBy', onDelete: 'SET NULL' })

Event.hasMany(EventActivity, { foreignKey: 'eventId', as: 'activities', onDelete: 'CASCADE', hooks: true })
EventActivity.belongsTo(Event, { foreignKey: 'eventId', as: 'event' })
Event.hasMany(EventQuestion, { foreignKey: 'eventId', as: 'questions', onDelete: 'CASCADE', hooks: true })
EventQuestion.belongsTo(Event, { foreignKey: 'eventId', as: 'event' })
Event.hasMany(EventRegistration, { foreignKey: 'eventId', as: 'registrations', onDelete: 'CASCADE', hooks: true })
EventRegistration.belongsTo(Event, { foreignKey: 'eventId', as: 'event' })
EventRegistration.belongsTo(User, { foreignKey: 'checkedInById', as: 'checkedInBy', onDelete: 'SET NULL' })
EventRegistration.hasMany(EventRegistrationActivity, { foreignKey: 'registrationId', as: 'picks', onDelete: 'CASCADE', hooks: true })
EventRegistrationActivity.belongsTo(EventRegistration, { foreignKey: 'registrationId', as: 'registration' })
EventRegistrationActivity.belongsTo(EventActivity, { foreignKey: 'activityId', as: 'activity' })
EventActivity.hasMany(EventRegistrationActivity, { foreignKey: 'activityId', as: 'picks', onDelete: 'CASCADE', hooks: true })
Payout.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy', onDelete: 'SET NULL' })

useAuditModel(AuditLog)
installAuditHooks()

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
  Subscriber,
  Booking,
  AdminInvite,
  Event,
  EventActivity,
  EventQuestion,
  EventRegistration,
  EventRegistrationActivity,
  Payout,
  PAYOUT_STATUSES,
  AuditLog,
  EVENT_STATUSES,
  FEE_PAYERS,
  TICKET_FIELDS,
  QUESTION_TYPES,
  REGISTRATION_STATUSES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_PROVIDERS,
  PROGRAM_STATUSES,
  OTP_PURPOSES,
  MESSAGE_STATUSES,
  SUBSCRIBER_STATUSES,
  BOOKING_STATUSES,
  XENTRIPAY_ENVIRONMENTS
}
