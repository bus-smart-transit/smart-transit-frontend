import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";

export default function PublicLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
