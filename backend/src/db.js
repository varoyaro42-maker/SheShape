import { Sequelize } from 'sequelize'

export const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'mysql',
  logging: false,
  define: {
    underscored: true,
    freezeTableName: true,
    timestamps: true
  },
  pool: {
    max: 10,
    min: 0,
    idle: 10000
  }
})

export async function connectDatabase() {
  await sequelize.authenticate()
}

export default sequelize
