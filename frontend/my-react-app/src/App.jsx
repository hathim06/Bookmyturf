import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import Home from "./pages/user/Home";
import FindTurfs from "./pages/user/FindTurfs";
import TurfDetails from "./pages/user/TurfDetails";
import Checkout from "./pages/user/Checkout";
import MyBookings from "./pages/user/MyBookings";
import BookingDetails from "./pages/user/BookingDetails";
import Wallet from "./pages/user/Wallet";
import Favorites from "./pages/user/Favorites";
import PaymentResult from "./pages/user/PaymentResult";
import Login from "./pages/user/Login";
import Signup from "./pages/user/Signup";
import Profile from "./pages/user/Profile";
import ForgotPassword from "./pages/user/ForgotPassword";
import ResetPassword from "./pages/user/ResetPassword";
import VerifyOtp from "./pages/user/VerifyOtp";
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import ManageTurfs from "./pages/owner/ManageTurfs";
import OwnerCategories from "./pages/owner/OwnerCategories";
import OwnerBookings from "./pages/owner/OwnerBookings";
import OwnerOffers from "./pages/owner/OwnerOffers";
import Schedule from "./pages/owner/Schedule";
import OwnerSubscription from "./pages/owner/OwnerSubscription";
import OwnerReport from "./pages/owner/OwnerReport";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminBookings from "./pages/admin/AdminBookings";
import CreateOwner from "./pages/admin/CreateOwner";
import UserManagement from "./pages/admin/UserManagement";
import AccountDetails from "./pages/admin/AccountDetails";
import AdminTurfs from "./pages/admin/AdminTurfs";
import AdminReport from "./pages/admin/AdminReport";
import ProtectedRoute from "./components/ProtectedRoute";
import GuestRoute from "./components/GuestRoute";
import ButtonConfirmation from "./components/ButtonConfirmation";
import SessionGuard from "./components/SessionGuard";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <BrowserRouter>
      <SessionGuard>
        <ButtonConfirmation>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/turfs" element={<FindTurfs />} />
            <Route path="/categories/:category" element={<FindTurfs />} />
            <Route path="/turfs/:id" element={<TurfDetails />} />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute role="user">
                  <Checkout />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings"
              element={
                <ProtectedRoute role="user">
                  <MyBookings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings/:id"
              element={
                <ProtectedRoute role="user">
                  <BookingDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wallet"
              element={
                <ProtectedRoute role="user">
                  <Wallet />
                </ProtectedRoute>
              }
            />
            <Route
              path="/favorites"
              element={
                <ProtectedRoute role="user">
                  <Favorites />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment/success"
              element={
                <ProtectedRoute role="user">
                  <PaymentResult success />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment/failure"
              element={
                <ProtectedRoute role="user">
                  <PaymentResult success={false} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/login"
              element={
                <GuestRoute>
                  <Login />
                </GuestRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <GuestRoute>
                  <Signup />
                </GuestRoute>
              }
            />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-otp" element={<VerifyOtp />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute role="user">
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/support"
              element={
                <ProtectedRoute role="user">
                  <Support />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/profile"
              element={
                <ProtectedRoute role="owner">
                  <Profile role="owner" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/dashboard"
              element={
                <ProtectedRoute role="owner">
                  <OwnerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/turfs"
              element={
                <ProtectedRoute role="owner">
                  <ManageTurfs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/turfs/new"
              element={
                <ProtectedRoute role="owner">
                  <ManageTurfs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/categories"
              element={
                <ProtectedRoute role="owner">
                  <OwnerCategories />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/bookings"
              element={
                <ProtectedRoute role="owner">
                  <OwnerBookings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/offers"
              element={
                <ProtectedRoute role="owner">
                  <OwnerOffers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/schedule"
              element={
                <ProtectedRoute role="owner">
                  <Schedule />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/subscription"
              element={
                <ProtectedRoute role="owner">
                  <OwnerSubscription />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/reports"
              element={
                <ProtectedRoute role="owner">
                  <OwnerReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/support"
              element={
                <ProtectedRoute role="owner">
                  <Support />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute role="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/bookings"
              element={
                <ProtectedRoute role="admin">
                  <AdminBookings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/profile"
              element={
                <ProtectedRoute role="admin">
                  <Profile role="admin" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/owners/new"
              element={
                <ProtectedRoute role="admin">
                  <CreateOwner />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute role="admin">
                  <UserManagement role="user" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/owners"
              element={
                <ProtectedRoute role="admin">
                  <UserManagement role="owner" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users/:id"
              element={
                <ProtectedRoute role="admin">
                  <AccountDetails role="user" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/owners/:id"
              element={
                <ProtectedRoute role="admin">
                  <AccountDetails role="owner" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/turfs"
              element={
                <ProtectedRoute role="admin">
                  <AdminTurfs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute role="admin">
                  <AdminReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/support"
              element={
                <ProtectedRoute role="admin">
                  <Support />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ButtonConfirmation>
      </SessionGuard>
    </BrowserRouter>
  );
}
