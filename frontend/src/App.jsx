import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Loading from './components/Loading.jsx'
import Home from './pages/Home.jsx'
import Shop from './pages/Shop.jsx'
import Product from './pages/Product.jsx'
import ProgramsPage from './pages/Programs.jsx'
import ProgramPage from './pages/Program.jsx'
import BlogPage from './pages/Blog.jsx'
import PostPage from './pages/Post.jsx'
import AboutPage from './pages/About.jsx'
import ContactPage from './pages/Contact.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import VerifyEmail from './pages/VerifyEmail.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import NotFound from './pages/NotFound.jsx'
import NewsletterStatus from './pages/NewsletterStatus.jsx'

// Everything behind a login is split out of the storefront bundle. Visitors
// never download the admin dashboard, Recharts, or the checkout.
const CustomerLayout = lazy(() => import('./components/CustomerLayout.jsx'))
const AdminRoute = lazy(() => import('./components/AdminRoute.jsx'))
const AdminLayout = lazy(() => import('./components/AdminLayout.jsx'))
const Cart = lazy(() => import('./pages/Cart.jsx'))
const Checkout = lazy(() => import('./pages/Checkout.jsx'))
const OrderConfirm = lazy(() => import('./pages/OrderConfirm.jsx'))
const MyOrders = lazy(() => import('./pages/MyOrders.jsx'))
const MyBookings = lazy(() => import('./pages/MyBookings.jsx'))
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Account = lazy(() => import('./pages/Account.jsx'))
const AdminDashboardPage = lazy(() => import('./pages/admin/Dashboard.jsx'))
const AdminUsersPage = lazy(() => import('./pages/admin/Users.jsx'))
const AdminUserDetailPage = lazy(() => import('./pages/admin/UserDetail.jsx'))
const AdminProductsPage = lazy(() => import('./pages/admin/Products.jsx'))
const AdminProductFormPage = lazy(() => import('./pages/admin/ProductForm.jsx'))
const AdminProgramsPage = lazy(() => import('./pages/admin/Programs.jsx'))
const AdminProgramFormPage = lazy(() => import('./pages/admin/ProgramForm.jsx'))
const AdminOrdersPage = lazy(() => import('./pages/admin/Orders.jsx'))
const AdminOrderDetailPage = lazy(() => import('./pages/admin/OrderDetail.jsx'))
const AdminPostsPage = lazy(() => import('./pages/admin/Posts.jsx'))
const AdminPostEditorPage = lazy(() => import('./pages/admin/PostEditor.jsx'))
const AdminPaymentSettingsPage = lazy(() => import('./pages/admin/PaymentSettings.jsx'))
const AdminHomeSettingsPage = lazy(() => import('./pages/admin/HomeSettings.jsx'))
const AdminMessagesPage = lazy(() => import('./pages/admin/Messages.jsx'))
const AdminMessageDetailPage = lazy(() => import('./pages/admin/MessageDetail.jsx'))
const AdminBookingsPage = lazy(() => import('./pages/admin/Bookings.jsx'))
const AdminBookingDetailPage = lazy(() => import('./pages/admin/BookingDetail.jsx'))
const AdminSubscribersPage = lazy(() => import('./pages/admin/Subscribers.jsx'))

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} />
          <Route path="product/:slug" element={<Product />} />
          <Route path="/programs" element={<ProgramsPage />} />
          <Route path="/programs/:slug" element={<ProgramPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<PostPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="verify-email" element={<VerifyEmail />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="newsletter/:state" element={<NewsletterStatus />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="users/:id" element={<AdminUserDetailPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="products/new" element={<AdminProductFormPage />} />
          <Route path="products/:id" element={<AdminProductFormPage />} />
          <Route path="programs" element={<AdminProgramsPage />} />
          <Route path="programs/new" element={<AdminProgramFormPage />} />
          <Route path="programs/:id" element={<AdminProgramFormPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="orders/:id" element={<AdminOrderDetailPage />} />
          <Route path="posts" element={<AdminPostsPage />} />
          <Route path="posts/new" element={<AdminPostEditorPage />} />
          <Route path="posts/:id" element={<AdminPostEditorPage />} />
          <Route path="settings" element={<AdminPaymentSettingsPage />} />
          <Route path="home" element={<AdminHomeSettingsPage />} />
          <Route path="messages" element={<AdminMessagesPage />} />
          <Route path="messages/:id" element={<AdminMessageDetailPage />} />
          <Route path="bookings" element={<AdminBookingsPage />} />
          <Route path="bookings/:id" element={<AdminBookingDetailPage />} />
          <Route path="subscribers" element={<AdminSubscribersPage />} />
          <Route path="account" element={<Account />} />
        </Route>

        <Route path="/dashboard" element={<ProtectedRoute denyAdmin />}>
          <Route element={<CustomerLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="shop" element={<Shop />} />
            <Route path="product/:slug" element={<Product />} />
            <Route path="programs" element={<ProgramsPage />} />
            <Route path="programs/:slug" element={<ProgramPage />} />
            <Route path="blog" element={<BlogPage />} />
            <Route path="blog/:slug" element={<PostPage />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="order/:orderNumber" element={<OrderConfirm />} />
            <Route path="orders" element={<MyOrders />} />
            <Route path="bookings" element={<MyBookings />} />
            <Route path="account" element={<Account />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  )
}
