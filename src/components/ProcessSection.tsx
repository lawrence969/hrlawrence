import { motion } from "framer-motion";

const customSteps = [
  { number: "01", title: "Free Consultation", description: "Book online and meet with our design experts" },
  { number: "02", title: "Design & Approval", description: "Review and approve your custom design" },
  { number: "03", title: "Craftsmanship", description: "Our artisans bring your vision to life" },
  { number: "04", title: "Delivery", description: "Schedule pickup of your finished piece" },
];

const ProcessSection = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-body tracking-[0.3em] uppercase text-accent mb-4">How It Works</p>
          <h2 className="text-3xl md:text-4xl font-display text-foreground">The Custom Journey</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {customSteps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="text-center relative"
            >
              <span className="text-6xl font-display text-border font-bold">{step.number}</span>
              <h3 className="font-display text-lg text-foreground mt-2 mb-2">{step.title}</h3>
              <p className="text-sm font-body text-muted-foreground">{step.description}</p>
              {index < customSteps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[60%] w-[80%] border-t border-dashed border-border" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProcessSection;
