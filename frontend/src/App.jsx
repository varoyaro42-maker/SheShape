import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import CustomerLayout from './components/CustomerLayout.jsx'
import AdminRoute from './components/AdminRoute.jsx'
import AdminLayout from './components/AdminLayout.jsx'
import AdminDashboardPage from './pages/admin/Dashboard.jsx'
import AdminUsersPage from './pages/admin/Users.jsx'
import AdminUserDetailPage from './pages/admin/UserDetail.jsx'
import AdminProductsPage from './pages/admin/Products.jsx'
import AdminProductFormPage from './pages/admin/ProductForm.jsx'
import AdminProgramsPage from './pages/admin/Programs.jsx'
import AdminProgramFormPage from './pages/admin/ProgramForm.jsx'
import AdminOrdersPage from './pages/admin/Orders.jsx'
import AdminOrderDetailPage from './pages/admin/OrderDetail.jsx'
import AdminPostsPage from './pages/admin/Posts.jsx'
import AdminPostEditorPage from './pages/admin/PostEditor.jsx'
import AdminPaymentSettingsPage from './pages/admin/PaymentSettings.jsx'
import AdminHomeSettingsPage from './pages/admin/HomeSettings.jsx'
import AdminMessagesPage from './pages/admin/Messages.jsx'
import AdminMessageDetailPage from './pages/admin/MessageDetail.jsx'
import Home from './pages/Home.jsx'
import Shop from './pages/Shop.jsx'
import Product from './pages/Product.jsx'
import Cart from './pages/Cart.jsx'
import Checkout from './pages/Checkout.jsx'
import OrderConfirm from './pages/OrderConfirm.jsx'
import MyOrders from './pages/MyOrders.jsx'
import Dashboard from './pages/Dashboard.jsx'
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
import Account from './pages/Account.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
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
          <Route path="account" element={<Account />} />
        </Route>
      </Route>
    </Routes>
  )
}
