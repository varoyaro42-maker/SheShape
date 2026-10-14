import { sequelize, HomeContent } from '../models/index.js'

async function run() {
  try {
    await sequelize.authenticate()
    console.log('DB:', sequelize.config.database, 'host:', sequelize.config.host)

    const [row] = await HomeContent.findOrCreate({ where: { id: 1 }, defaults: { data: {} } })
    console.log('before update, hero.title:', row.data?.hero?.title)

    const marker = 'DEBUG-' + Date.now()
    row.data = { ...row.data, hero: { ...row.data.hero, title: marker } }
    row.changed('data', true)
    await row.save()
    console.log('saved marker:', marker)

    const fresh = await HomeContent.findByPk(1)
    console.log('re-fetch via findByPk, hero.title:', fresh.data?.hero?.title)

    const [raw] = await sequelize.query('SELECT data FROM home_content WHERE id=1')
    const rawData = typeof raw[0].data === 'string' ? JSON.parse(raw[0].data) : raw[0].data
    console.log('raw SQL hero.title:', rawData.hero?.title)

    process.exit(0)
  } catch (error) {
    console.error('DEBUG ERROR:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

run()
