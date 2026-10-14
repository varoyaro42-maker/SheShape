import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const Post = sequelize.define(
  'Post',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(180),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Title is required' },
        len: { args: [3, 180], msg: 'Title must be between 3 and 180 characters' },
      },
    },
    slug: {
      type: DataTypes.STRING(200),
      allowNull: false,
      unique: true,
    },
    excerpt: {
      type: DataTypes.STRING(300),
      allowNull: false,
      defaultValue: '',
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
    coverImage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'cover_image',
      validate: { isUrl: { msg: 'Cover image must be a URL' } },
    },
    authorId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'author_id',
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_published',
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'published_at',
    },
  },
  {
    tableName: 'posts',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['slug'], unique: true },
      { fields: ['is_published', 'published_at'] },
    ],
  }
);

export default Post;
