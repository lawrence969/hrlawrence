import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import logoNavy from "@/assets/logo-navy.jpg";
import { useAuth } from "@/hooks/useAuth";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, isStaff } = useAuth();

  const links = [
    { to: "/", label: "Home" },
    { to: "/book-consultation", label: "Book Consultation" },
    { to: "/track-order", label: "Track Order" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex-shrink-0">
          <img src={logoNavy} alt="HR Lawrence Fine Jewelry" className="h-10" />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <Link key={link.to} to={link.to}
              className={`text-sm font-body font-medium tracking-widest uppercase transition-colors hover:text-accent ${
                location.pathname === link.to ? "text-accent" : "text-foreground"
              }`}>{link.label}</Link>
          ))}
          {user ? (
            <>
              <Link to="/my-orders" className={`text-sm font-body font-medium tracking-widest uppercase transition-colors hover:text-accent ${location.pathname === "/my-orders" ? "text-accent" : "text-foreground"}`}>My Orders</Link>
              {isStaff && <Link to="/admin" className="text-sm font-body font-medium tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors">Staff Portal</Link>}
            </>
          ) : (
            <Link to="/auth" className="text-sm font-body font-medium tracking-widest uppercase text-accent hover:text-foreground transition-colors">Sign In</Link>
          )}
        </div>

        <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-foreground">
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isOpen && (
        <div className="md:hidden bg-background border-b border-border px-6 py-4 space-y-4">
          {links.map((link) => (
            <Link key={link.to} to={link.to} onClick={() => setIsOpen(false)}
              className="block text-sm font-body font-medium tracking-widest uppercase text-foreground hover:text-accent">{link.label}</Link>
          ))}
          {user ? (
            <>
              <Link to="/my-orders" onClick={() => setIsOpen(false)} className="block text-sm font-body font-medium tracking-widest uppercase text-foreground hover:text-accent">My Orders</Link>
              {isStaff && <Link to="/admin" onClick={() => setIsOpen(false)} className="block text-sm font-body font-medium tracking-widest uppercase text-muted-foreground hover:text-foreground">Staff Portal</Link>}
            </>
          ) : (
            <Link to="/auth" onClick={() => setIsOpen(false)} className="block text-sm font-body font-medium tracking-widest uppercase text-accent hover:text-foreground">Sign In</Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
