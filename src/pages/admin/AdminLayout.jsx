import { NavLink, Outlet } from "react-router-dom";
import Navbar from "../../components/Navbar";

const linkBase = "px-3 py-2 rounded-md text-sm font-medium";
const active = "bg-primary text-primary-content";
const idle = "hover:bg-base-200";

export default function AdminLayout() {
  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <aside className="col-span-12 md:col-span-3 lg:col-span-2">
          <div className="sticky top-4 space-y-2 flex flex-col">
            <h2 className="text-sm opacity-60 uppercase tracking-wide mb-2">Admin</h2>
            <NavLink to="/admin" end className={({isActive})=>`${linkBase} ${isActive?active:idle}`}>Dashboard</NavLink>
            <NavLink to="/admin/users" className={({isActive})=>`${linkBase} ${isActive?active:idle}`}>User management</NavLink>
            <NavLink to="/admin/profile-requests" className={({isActive})=>`${linkBase} ${isActive?active:idle}`}>Profile change requests</NavLink>
            <NavLink to="/admin/expert-requests" className={({isActive})=>`${linkBase} ${isActive?active:idle}`}>Become expert requests</NavLink>
            <NavLink to="/admin/deleted-users" className={({isActive})=>`${linkBase} ${isActive?active:idle}`}>Deleted users</NavLink>
            <NavLink to="/admin/transactions" className={({isActive})=>`${linkBase} ${isActive?active:idle}`}>Transactions</NavLink>
            <NavLink to="/admin/statistics" className={({isActive})=>`${linkBase} ${isActive?active:idle}`}>Statistics</NavLink>
            <NavLink to="/" className={`${linkBase} ${idle}`}>← Go to Home</NavLink>
          </div>
        </aside>

        {/* Content */}
        <main className="col-span-12 md:col-span-9 lg:col-span-10">
          <Outlet />
        </main>
      </div>
    </>
  );
}
