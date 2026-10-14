import { Link } from 'react-router-dom'
import Empty from '../components/Empty.jsx'

export default function NotFound() {
  return (
    <div className="page">
      <Empty title="Page not found" message="The page you are looking for does not exist.">
        <Link to="/" className="btn">
          Go home
        </Link>
      </Empty>
    </div>
  )
}
