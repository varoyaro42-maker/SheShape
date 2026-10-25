import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useApi } from '../hooks/useApi.js'
import { formatPrice } from '../utils/format.js'
import { formatEventDate } from '../api/events.js'
import { formatPostDate } from '../utils/post.js'
import styles from './MegaMenu.module.css'

const INTRO = {
  '/shop': {
    title: 'Shop',
    blurb: 'Everything you need for training, picked by the She Shape Wellness team.',
    label: 'View all products'
  },
  '/programs': {
    title: 'Programs',
    blurb: 'Coached strength classes and small-group programs for women in Kigali.',
    label: 'View all programs'
  },
  '/events': {
    title: 'Events',
    blurb: 'Workshops, challenges and community days. Reserve your place.',
    label: 'View all events'
  },
  '/blog': {
    title: 'Blog',
    blurb: 'Training tips, nutrition and stories from the She Shape community.',
    label: 'Read the blog'
  }
}

function Card({ to, image, kicker, title, sub, onNavigate }) {
  return (
    <Link to={to} className={styles.card} onClick={onNavigate}>
      <div className={styles.image} style={image ? { backgroundImage: `url("${image}")` } : undefined} />
      {kicker && <span className={styles.kicker}>{kicker}</span>}
      <span className={styles.cardTitle}>{title}</span>
      {sub && <span className={styles.sub}>{sub}</span>}
    </Link>
  )
}

function Cards({ state, items, onNavigate }) {
  if (state.loading) return <p className={styles.message}>Loading...</p>
  if (state.error) return <p className={styles.message}>Could not load right now. Use the button to see everything.</p>
  if (!items.length) return <p className={styles.message}>Nothing here yet. Check back soon.</p>
  return items.map((item) => <Card key={item.to} {...item} onNavigate={onNavigate} />)
}

function useShop() {
  const products = useApi('/products', { limit: 4 })
  const categories = useApi('/products/categories')
  return {
    state: products,
    categories: (categories.data ?? []).map((c) => ({ to: `/shop?category=${encodeURIComponent(c.slug)}`, label: c.name })),
    items: (products.data ?? []).slice(0, 4).map((p) => ({
      to: `/product/${p.slug}`,
      image: p.images?.[0]?.url,
      kicker: p.category?.name,
      title: p.name,
      sub: formatPrice(p.price)
    }))
  }
}

function usePrograms() {
  const state = useApi('/programs')
  return {
    state,
    categories: [],
    items: (state.data ?? []).slice(0, 4).map((p) => ({
      to: `/programs/${p.slug}`,
      image: p.coverImage,
      kicker: p.label,
      title: p.name,
      sub: p.tagline || (p.price ? formatPrice(p.price) : '')
    }))
  }
}

function useEvents() {
  const state = useApi('/events')
  const all = state.data ?? []
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = all.filter((e) => e.date >= today)
  return {
    state,
    categories: [],
    items: (upcoming.length ? upcoming : all).slice(0, 4).map((e) => ({
      to: `/events/${e.slug}`,
      image: e.heroImage,
      kicker: formatEventDate(e.date),
      title: e.title,
      sub: e.venue || e.tagline
    }))
  }
}

function useBlog() {
  const state = useApi('/posts', { limit: 4 })
  return {
    state,
    categories: [],
    items: (state.data ?? []).slice(0, 4).map((p) => ({
      to: `/blog/${p.slug}`,
      image: p.coverImage,
      kicker: p.publishedAt ? formatPostDate(p.publishedAt) : '',
      title: p.title,
      sub: p.excerpt
    }))
  }
}

function Panel({ section, useData, onNavigate }) {
  const { state, categories, items } = useData()
  const intro = INTRO[section]

  return (
    <div className={`page ${styles.inner}`}>
      <div className={styles.intro}>
        <h3>{intro.title}</h3>
        <p>{intro.blurb}</p>
        {categories.length > 0 && (
          <ul className={styles.cats}>
            {categories.map((c) => (
              <li key={c.to}>
                <Link to={c.to} onClick={onNavigate}>
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link to={section} className={styles.all} onClick={onNavigate}>
          {intro.label} <ArrowRight size={15} />
        </Link>
      </div>
      <div className={styles.grid}>
        <Cards state={state} items={items} onNavigate={onNavigate} />
      </div>
    </div>
  )
}

const DATA = {
  '/shop': useShop,
  '/programs': usePrograms,
  '/events': useEvents,
  '/blog': useBlog
}

export default function MegaMenu({ section, onEnter, onNavigate }) {
  return (
    <div className={styles.panel} onMouseEnter={onEnter} role="region" aria-label={`${INTRO[section].title} preview`}>
      <Panel key={section} section={section} useData={DATA[section]} onNavigate={onNavigate} />
    </div>
  )
}
