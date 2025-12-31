import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Menu, X, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? "bg-background/95 backdrop-blur-lg shadow-[0_4px_20px_-4px_hsl(215_25%_15%_/_0.08)] border-b border-border/50"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-[0_0_20px_hsl(152_60%_28%_/_0.3)]">
                <MapPin className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className={`font-display font-bold text-xl tracking-tight transition-colors ${isScrolled ? "text-foreground" : "text-primary-foreground"}`}>
                  Rota 399
                </span>
                <span className={`text-xs font-medium transition-colors ${isScrolled ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
                  Paraná
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <button
                onClick={() => scrollToSection("sobre")}
                className={`text-sm font-medium transition-colors hover:text-primary ${isScrolled ? "text-foreground" : "text-primary-foreground"}`}
              >
                Sobre
              </button>
              <button
                onClick={() => scrollToSection("mapa")}
                className={`text-sm font-medium transition-colors hover:text-primary ${isScrolled ? "text-foreground" : "text-primary-foreground"}`}
              >
                Mapa
              </button>
              <button
                onClick={() => scrollToSection("indicadores")}
                className={`text-sm font-medium transition-colors hover:text-primary ${isScrolled ? "text-foreground" : "text-primary-foreground"}`}
              >
                Indicadores
              </button>
              <Link to="/dashboard">
                <Button variant={isScrolled ? "outline" : "glassDark"} size="sm">
                  Dashboard
                </Button>
              </Link>
              <Button
                onClick={() => scrollToSection("sugestao")}
                variant={isScrolled ? "hero" : "hero"}
                size="sm"
              >
                Envie sua Ideia
              </Button>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`md:hidden p-2 rounded-lg transition-colors ${isScrolled ? "text-foreground hover:bg-muted" : "text-primary-foreground hover:bg-primary-foreground/10"}`}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 pt-20 bg-background/98 backdrop-blur-xl md:hidden"
          >
            <nav className="flex flex-col items-center gap-6 p-8">
              <button
                onClick={() => scrollToSection("sobre")}
                className="text-xl font-medium text-foreground hover:text-primary transition-colors"
              >
                Sobre
              </button>
              <button
                onClick={() => scrollToSection("mapa")}
                className="text-xl font-medium text-foreground hover:text-primary transition-colors"
              >
                Mapa
              </button>
              <button
                onClick={() => scrollToSection("indicadores")}
                className="text-xl font-medium text-foreground hover:text-primary transition-colors"
              >
                Indicadores
              </button>
              <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="outline" size="lg">
                  Dashboard
                </Button>
              </Link>
              <Button
                onClick={() => scrollToSection("sugestao")}
                variant="hero"
                size="lg"
              >
                Envie sua Ideia
              </Button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
