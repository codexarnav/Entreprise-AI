import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, TrendingUp, Users } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const competitors = [
  {
    name: "TechCorp Solutions",
    avgPrice: 180000,
    winRate: 68,
    overlap: 85,
    status: "High Threat",
  },
  {
    name: "Global Systems Inc",
    avgPrice: 165000,
    winRate: 72,
    overlap: 75,
    status: "Medium Threat",
  },
  {
    name: "Innovation Partners",
    avgPrice: 195000,
    winRate: 55,
    overlap: 60,
    status: "Low Threat",
  },
];

const pricingComparison = [
  { category: "Small", us: 120, comp1: 135, comp2: 115 },
  { category: "Medium", us: 180, comp1: 195, comp2: 170 },
  { category: "Large", us: 250, comp1: 280, comp2: 240 },
  { category: "Enterprise", us: 400, comp1: 450, comp2: 380 },
];

const winProbability = [
  { quarter: "Q1", probability: 65 },
  { quarter: "Q2", probability: 70 },
  { quarter: "Q3", probability: 75 },
  { quarter: "Q4", probability: 78 },
];

export default function CompetitorAnalysis() {
  const userRole = localStorage.getItem("userRole") as "admin" | "employee";

  return (
    <Layout role={userRole}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Competitor Analysis</h1>
            <p className="text-muted-foreground">
              Track and analyze competitor RFPs and strategies
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Competitor
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Upload Competitor RFP
            </h3>
            <div className="space-y-4">
              <div>
                <Label>Competitor Name</Label>
                <Input placeholder="Enter competitor name" />
              </div>
              <div>
                <Label>RFP Document or URL</Label>
                <div className="mt-2 flex items-center justify-center border-2 border-dashed border-border rounded-lg p-6 hover:border-primary transition-colors cursor-pointer">
                  <div className="text-center">
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Drop files here or click to upload
                    </p>
                  </div>
                </div>
              </div>
              <Button className="w-full">Analyze RFP</Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Win Probability Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={winProbability}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="quarter" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="probability"
                  stroke="hsl(142, 71%, 45%)"
                  strokeWidth={2}
                  dot={{ fill: "hsl(142, 71%, 45%)", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <Card className="p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Pricing Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pricingComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip formatter={(value: number) => `$${value}K`} />
              <Legend />
              <Bar dataKey="us" fill="hsl(220, 70%, 50%)" name="Us" radius={[8, 8, 0, 0]} />
              <Bar dataKey="comp1" fill="hsl(180, 70%, 50%)" name="TechCorp" radius={[8, 8, 0, 0]} />
              <Bar dataKey="comp2" fill="hsl(142, 71%, 45%)" name="Global Systems" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <div className="grid gap-4">
          {competitors.map((competitor, index) => (
            <motion.div
              key={competitor.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="p-6 hover:shadow-medium transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-gradient-to-br from-secondary to-secondary/80">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">{competitor.name}</h3>
                      <div className="flex gap-2 mt-2">
                        <Badge
                          variant={
                            competitor.status === "High Threat"
                              ? "destructive"
                              : competitor.status === "Medium Threat"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {competitor.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Avg Price</p>
                    <p className="text-xl font-bold">${competitor.avgPrice.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Win Rate</p>
                    <p className="text-xl font-bold">{competitor.winRate}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Tech Overlap</p>
                    <p className="text-xl font-bold">{competitor.overlap}%</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </Layout>
  );
}
