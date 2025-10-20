// src/App.jsx

import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Inbox from "./pages/Inbox.jsx";
import Register from "./pages/Register.jsx";
import Profile from "./pages/Profile.jsx";
import NotificationsPage from "./pages/Notifications.jsx";
import Navbar from "./components/Navbar.jsx";

import AdminLayout from "./pages/admin/AdminLayout.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminUsers from "./pages/admin/AdminUsers.jsx";
import AdminProfileRequests from "./pages/admin/AdminProfileRequests.jsx";
import AdminExpertRequests from "./pages/admin/AdminExpertRequests.jsx";
import AdminDeletedUsers from "./pages/admin/AdminDeletedUsers.jsx";
import AdminTransactions from "./pages/admin/AdminTransactions.jsx";
import AdminStats from "./pages/admin/AdminStats.jsx";
import AdminGuard from "./pages/admin/AdminGuard.jsx";
import Wallet from "./pages/Wallet";
import { WalletSuccess, WalletFail } from "./pages/WalletStatus";


export default function App() {
  return (
    <>
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="/notifications" element={<NotificationsPage />} />


        {/* Admin area (example). Replace with your Guards if needed */}
        <Route element={<AdminGuard />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="profile-requests" element={<AdminProfileRequests />} />
            <Route path="expert-requests" element={<AdminExpertRequests />} />
            <Route path="deleted-users" element={<AdminDeletedUsers />} />
            <Route path="transactions" element={<AdminTransactions />} />
            <Route path="statistics" element={<AdminStats />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<div className="p-8">Not Found</div>} />

        <Route path="/wallet" element={<Wallet />} />

        <Route path="/wallet/success" element={<WalletSuccess />} />
        <Route path="/wallet/fail" element={<WalletFail />} />

      </Routes>
    </>
  );
}



// export default function App() {
//   return (
//     // <Routes>
//     //   <Route path="/" element={<Home />} />
//     //     <Route path="/login" element={<Login />} />
//     //     <Route path="/register" element={<Register />} />
//     //     <Route path="/inbox" element={<Inbox />} />
//     //     <Route path="*" element={<Navigate to="/" replace />} />
//     //     <Route path="/profile/:id" element={<Profile />} />
//     // </Routes>
//     <BrowserRouter>
//       <Routes>
//         {/* public routes */}
//         <Route path="/" element={<Home />} />
//         <Route path="/login" element={<Login />} />
//         <Route path="/register" element={<Register />} />
//         <Route path="/inbox" element={<Inbox />} />
//         <Route path="*" element={<Navigate to="/" replace />} />
//         <Route path="/profile/:id" element={<Profile />} />
//         {/* ...others */}

//         {/* ADMIN */}
//         <Route element={<AdminGuard />}>
//           <Route path="/admin" element={<AdminLayout />}>
//             <Route index element={<AdminDashboard />} />
//             <Route path="users" element={<AdminUsers />} />
//             <Route path="profile-requests" element={<AdminProfileRequests />} />
//             <Route path="expert-requests" element={<AdminExpertRequests />} />
//             <Route path="deleted-users" element={<AdminDeletedUsers />} />
//             <Route path="transactions" element={<AdminTransactions />} />
//             <Route path="statistics" element={<AdminStats />} />
//           </Route>
//         </Route>

//         <Route path="*" element={<div className="p-8">Not Found</div>} />
//       </Routes>
//     </BrowserRouter>
//   );
// }
