import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import logoNavy from "@/assets/logo-navy.jpg";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

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

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-body font-medium tracking-widest uppercase transition-colors hover:text-accent ${
                location.pathname === link.to ? "text-accent" : "text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/admin"
            className="text-sm font-body font-medium tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
          >
            Staff Portal
          </Link>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-foreground">
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-background border-b border-border px-6 py-4 space-y-4">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setIsOpen(false)}
              className="block text-sm font-body font-medium tracking-widest uppercase text-foreground hover:text-accent"
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/admin"
            onClick={() => setIsOpen(false)}
            className="block text-sm font-body font-medium tracking-widest uppercase text-muted-foreground hover:text-foreground"
          >
            Staff Portal
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
