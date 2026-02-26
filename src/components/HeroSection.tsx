import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import heroImage from "@/assets/showroom.png";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-primary/70" />

      <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-sm font-body tracking-[0.3em] uppercase text-gold mb-6"
        >
          Fine Jewelry Since Establishment
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-4xl md:text-6xl lg:text-7xl font-display text-primary-foreground mb-6 leading-tight"
        >
          Exquisite Craftsmanship,{" "}
          <span className="italic text-gold-light">Timeless Elegance</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-lg font-body text-primary-foreground/80 mb-10 max-w-xl mx-auto"
        >
          From bespoke creations to expert repairs, we bring your vision to life with unparalleled artistry.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link
            to="/book-consultation"
            className="inline-block px-8 py-4 bg-accent text-accent-foreground font-body font-semibold text-sm tracking-widest uppercase hover:bg-gold-light transition-colors"
          >
            Book Free Consultation
          </Link>
          <Link
            to="/track-order"
            className="inline-block px-8 py-4 border border-primary-foreground/40 text-primary-foreground font-body font-semibold text-sm tracking-widest uppercase hover:bg-primary-foreground/10 transition-colors"
          >
            Track Your Order
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
