import { motion } from "framer-motion";
import { Gem, Wrench, Clock, Shield } from "lucide-react";

const services = [
  {
    icon: Gem,
    title: "Custom Design",
    description: "From concept to creation, we craft bespoke pieces that tell your unique story.",
  },
  {
    icon: Wrench,
    title: "Expert Repairs",
    description: "Restore your treasured pieces to their original brilliance with our skilled artisans.",
  },
  {
    icon: Clock,
    title: "Real-Time Tracking",
    description: "Stay informed at every stage with our transparent order tracking system.",
  },
  {
    icon: Shield,
    title: "Quality Guaranteed",
    description: "Every piece meets our exacting standards of craftsmanship and quality.",
  },
];

const ServicesSection = () => {
  return (
    <section className="py-24 bg-cream">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-body tracking-[0.3em] uppercase text-accent mb-4">What We Offer</p>
          <h2 className="text-3xl md:text-4xl font-display text-foreground">Our Services</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-background p-8 text-center border border-border hover:shadow-lg transition-shadow"
            >
              <service.icon className="w-8 h-8 text-accent mx-auto mb-6" strokeWidth={1.5} />
              <h3 className="font-display text-lg text-foreground mb-3">{service.title}</h3>
              <p className="text-sm font-body text-muted-foreground leading-relaxed">{service.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
