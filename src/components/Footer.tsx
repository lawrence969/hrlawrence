import logoWhite from "@/assets/logo-white.jpg";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground py-16">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <img src={logoWhite} alt="HR Lawrence Fine Jewelry" className="h-12 mb-6" />
            <p className="text-sm opacity-80 font-body leading-relaxed">
              Crafting exquisite fine jewelry with precision and passion since establishment.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-body font-semibold tracking-widest uppercase mb-4 text-gold">Services</h4>
            <ul className="space-y-2 text-sm opacity-80 font-body">
              <li>Custom Jewelry Design</li>
              <li>Jewelry Repair</li>
              <li>Free Consultations</li>
              <li>Appraisals</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-body font-semibold tracking-widest uppercase mb-4 text-gold">Hours</h4>
            <ul className="space-y-2 text-sm opacity-80 font-body">
              <li>Monday – Sunday</li>
              <li>10:00 AM – 4:00 PM</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-primary-foreground/20 mt-12 pt-8 text-center text-sm opacity-60 font-body">
          © {new Date().getFullYear()} HR Lawrence Fine Jewelry. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
