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
    "2": [1.69, 1.82, 1.95, 2.08, 2.21, 2.34, 2.41, 2.47, 2.54],
    "3": [2.73, 2.86, 2.99, 3.25, 3.38, 3.51, 3.64, 3.77, 3.90],
    "4": [3.77, 4.03, 4.16, 4.29, 4.42, 4.55, 4.81, 5.07, 5.46],
    "5": [4.55, 4.81, 5.07, 5.33, 5.59, 5.85, 6.11, 6.37, 6.63],
    "6": [5.46, 5.72, 5.98, 6.24, 6.63, 6.89, 7.15, 7.54, 7.93],
    "7": [6.50, 6.76, 7.02, 7.41, 7.80, 8.06, 8.45, 8.84, 9.10],
  },
  flat: {
    "2": [1.95, 2.09, 2.25, 2.39, 2.55, 2.69, 2.77, 2.85, 2.91],
    "3": [3.15, 3.29, 3.45, 3.74, 3.89, 4.04, 4.19, 4.34, 4.49],
    "4": [4.34, 4.64, 4.78, 4.94, 5.08, 5.24, 5.54, 5.84, 6.28],
    "5": [5.24, 5.54, 5.84, 6.14, 6.44, 6.73, 7.03, 7.33, 7.63],
    "6": [6.28, 6.58, 6.88, 7.18, 7.63, 7.93, 8.23, 8.67, 9.13],
    "7": [7.48, 7.77, 8.07, 8.53, 8.97, 9.27, 9.72, 10.17, 10.47],
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

    return { weight, pricePerGramWithLabour, adjustedWeight, cost };
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
                  <span className="text-sm font-body text-muted-foreground">Final Cost</span>
                  <span className="text-2xl font-display text-foreground font-bold">
                    ${result.cost.toFixed(2)}
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
