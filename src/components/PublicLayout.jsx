import { useLocation } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";

export default function PublicLayout({ children }) {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main key={pathname} className="flex-1 motion-safe:animate-page-in">
        {children}
      </main>
      <Footer />
    </div>
  );
}
