import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const timeSlots = [
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM",
  "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM",
];

const BookConsultation = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", phone: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const parseTime = (timeStr: string, date: Date): Date => {
    const [time, period] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    const d = new Date(date);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      toast({ title: "Please select a date and time", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const startTime = parseTime(selectedTime, selectedDate);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

    const { error } = await supabase.from("appointments").insert({
      appointment_type: "consultation",
      customer_email: formData.email,
      first_name: formData.firstName,
      last_name: formData.lastName,
      phone: formData.phone,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
    });

    if (error) {
      toast({ title: "Booking Error", description: error.message, variant: "destructive" });
    } else {
      setSubmitted(true);
      toast({ title: "Consultation Booked!", description: "We'll be in touch to confirm your appointment." });

      // Notify staff via email
      supabase.functions.invoke("notify-consultation", {
        body: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          date: selectedDate?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
          time: selectedTime,
        },
      }).catch((err) => console.error("Staff notification failed:", err));
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="pt-32 pb-24 flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md mx-auto px-6">
            <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">✓</span>
            </div>
            <h2 className="text-3xl font-display text-foreground mb-4">Consultation Booked</h2>
            <p className="font-body text-muted-foreground mb-2">
              {selectedDate?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at {selectedTime}
            </p>
            <p className="font-body text-muted-foreground text-sm">
              A confirmation has been sent to {formData.email}. You may cancel up to 24 hours before your appointment.
            </p>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-32 pb-24 bg-cream">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-sm font-body tracking-[0.3em] uppercase text-accent mb-4">Complimentary</p>
            <h1 className="text-3xl md:text-5xl font-display text-foreground mb-4">Book a Free Consultation</h1>
            <p className="font-body text-muted-foreground max-w-lg mx-auto">
              Meet with our design experts to discuss your vision for a bespoke piece. Available Monday through Sunday, 10 AM – 4 PM.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div>
                <h3 className="font-display text-lg text-foreground mb-4">Select Date & Time</h3>
                <div className="bg-background border border-border p-4 mb-6 inline-block">
                  <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} disabled={(date) => date < new Date()} className="pointer-events-auto" />
                </div>
                {selectedDate && (
                  <div>
                    <p className="font-body text-sm text-muted-foreground mb-3">Available times:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {timeSlots.map((time) => (
                        <button type="button" key={time} onClick={() => setSelectedTime(time)}
                          className={`py-2 px-3 text-sm font-body border transition-colors ${
                            selectedTime === time ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-foreground hover:border-accent"
                          }`}>{time}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-display text-lg text-foreground mb-4">Your Information</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" className="font-body text-sm">First Name</Label>
                      <Input id="firstName" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="font-body text-sm">Last Name</Label>
                      <Input id="lastName" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email" className="font-body text-sm">Email</Label>
                    <Input id="email" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="font-body text-sm">Phone Number</Label>
                    <Input id="phone" type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="mt-1" />
                  </div>
                </div>
                <Button type="submit" disabled={submitting} className="w-full mt-8 py-6 bg-primary text-primary-foreground font-body font-semibold text-sm tracking-widest uppercase hover:bg-navy-light transition-colors">
                  {submitting ? "Booking..." : "Book Consultation"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default BookConsultation;
