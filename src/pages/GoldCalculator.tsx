import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const SIZES = [5, 6, 7, 8, 9, 10, 11, 12, 13];

const WEIGHTS: Record<string, Record<string, number[]>> = {
  round: {
    "2": [1.30, 1.40, 1.50, 1.60, 1.70, 1.80, 1.85, 1.90, 1.95],
    "3": [2.10, 2.20, 2.30, 2.50, 2.60, 2.70, 2.80, 2.90, 3.00],
    "4": [2.90, 3.10, 3.20, 3.30, 3.40, 3.50, 3.70, 3.90, 4.20],
    "5": [3.50, 3.70, 3.90, 4.10, 4.30, 4.50, 4.70, 4.90, 5.10],
    "6": [4.20, 4.40, 4.60, 4.80, 5.10, 5.30, 5.50, 5.80, 6.10],
    "7": [5.00, 5.20, 5.40, 5.70, 6.00, 6.20, 6.50, 6.80, 7.00],
  },
  flat: {
    "2": [1.50, 1.61, 1.73, 1.84, 1.96, 2.07, 2.13, 2.19, 2.24],
    "3": [2.42, 2.53, 2.65, 2.88, 2.99, 3.11, 3.22, 3.34, 3.45],
    "4": [3.34, 3.57, 3.68, 3.80, 3.91, 4.03, 4.26, 4.49, 4.83],
    "5": [4.03, 4.26, 4.49, 4.72, 4.95, 5.18, 5.41, 5.64, 5.87],
    "6": [4.83, 5.06, 5.29, 5.52, 5.87, 6.10, 6.33, 6.67, 7.02],
    "7": [5.75, 5.98, 6.21, 6.56, 6.90, 7.13, 7.48, 7.82, 8.05],
  },
};

const LABOUR: Record<string, number> = { "10": 20, "14": 22, "18": 25 };
const WEIGHT_MULT: Record<string, number> = { "10": 1.0, "14": 1.2, "18": 1.4 };

const GoldCalculator = () => {
  const [goldPrice, setGoldPrice] = useState("");
  const [ringType, setRingType] = useState("");
  const [width, setWidth] = useState("");
  const [size, setSize] = useState("");
  const [karat, setKarat] = useState("");

  const result = useMemo(() => {
    const gp = parseFloat(goldPrice);
    if (!gp || !ringType || !width || !size || !karat) return null;

    const sizeIndex = SIZES.indexOf(parseInt(size));
    if (sizeIndex === -1) return null;

    const weight = WEIGHTS[ringType]?.[width]?.[sizeIndex];
    if (weight === undefined) return null;

    const k = parseInt(karat);
    const adjustedGold = gp + 5000;
    const perGram = (adjustedGold / 1000) * (k / 24);
    const pricePerGramWithLabour = perGram + LABOUR[karat];
    const adjustedWeight = weight * WEIGHT_MULT[karat];
    const cost = pricePerGramWithLabour * adjustedWeight;
    const markup = cost * 0.5;
    const totalWithMarkup = cost + markup;

    return { weight, pricePerGramWithLabour, adjustedWeight, cost, markup, totalWithMarkup };
  }, [goldPrice, ringType, width, size, karat]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-6 max-w-xl">
          <h1 className="font-display text-3xl md:text-4xl text-foreground text-center mb-2">
            Gold Wedding Band Calculator
          </h1>
          <p className="text-muted-foreground text-center mb-10 font-body tracking-wide text-sm">
            Calculate the exact cost of a custom gold wedding band
          </p>

          <Card className="border-border/50 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="font-display text-lg text-foreground">Ring Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground font-body">Today's Gold Price</Label>
                <Input
                  type="number"
                  placeholder="Enter gold price"
                  value={goldPrice}
                  onChange={(e) => setGoldPrice(e.target.value)}
                  className="font-body"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground font-body">Ring Type</Label>
                  <Select value={ringType} onValueChange={setRingType}>
                    <SelectTrigger className="font-body"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="round">Round</SelectItem>
                      <SelectItem value="flat">Flat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground font-body">Width</Label>
                  <Select value={width} onValueChange={setWidth}>
                    <SelectTrigger className="font-body"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["2", "3", "4", "5", "6", "7"].map((w) => (
                        <SelectItem key={w} value={w}>{w}mm</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground font-body">Ring Size</Label>
                  <Select value={size} onValueChange={setSize}>
                    <SelectTrigger className="font-body"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {SIZES.map((s) => (
                        <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground font-body">Gold Karat</Label>
                  <Select value={karat} onValueChange={setKarat}>
                    <SelectTrigger className="font-body"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10K</SelectItem>
                      <SelectItem value="14">14K</SelectItem>
                      <SelectItem value="18">18K</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {result && (
            <Card className="mt-6 border-accent/30 shadow-lg">
              <CardContent className="pt-6 space-y-3">
                <div className="flex justify-between text-sm font-body text-muted-foreground">
                  <span>Weight</span>
                  <span className="text-foreground font-medium">{result.weight.toFixed(2)} g</span>
                </div>
                <div className="flex justify-between text-sm font-body text-muted-foreground">
                  <span>Price per gram (incl. labour)</span>
                  <span className="text-foreground font-medium">${result.pricePerGramWithLabour.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-body text-muted-foreground">
                  <span>Adjusted weight</span>
                  <span className="text-foreground font-medium">{result.adjustedWeight.toFixed(2)} g</span>
                </div>
                <div className="border-t border-border my-2" />
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-body text-muted-foreground">Base Cost</span>
                  <span className="text-lg font-display text-foreground font-semibold">
                    ${result.cost.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-body text-muted-foreground">
                  <span>Markup (50%)</span>
                  <span className="text-foreground font-medium">${result.markup.toFixed(2)}</span>
                </div>
                <div className="border-t border-border my-2" />
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-body text-muted-foreground">Total with Markup</span>
                  <span className="text-2xl font-display text-foreground font-bold">
                    ${result.totalWithMarkup.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default GoldCalculator;
