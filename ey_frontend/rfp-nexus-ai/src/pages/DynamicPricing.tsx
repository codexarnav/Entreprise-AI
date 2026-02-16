import { useState } from "react";
import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { DollarSign, ArrowRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function DynamicPricing() {
  const navigate = useNavigate();
  const [resources, setResources] = useState([8]);
  const [materials, setMaterials] = useState([50000]);
  const [manpower, setManpower] = useState([12]);

  const baseRate = 150;
  const totalCost =
    resources[0] * baseRate * 160 + materials[0] + manpower[0] * 120 * 160;

  const costBreakdown = [
    { name: "Resources", value: resources[0] * baseRate * 160, color: "hsl(220, 70%, 50%)" },
    { name: "Materials", value: materials[0], color: "hsl(180, 70%, 50%)" },
    { name: "Manpower", value: manpower[0] * 120 * 160, color: "hsl(142, 71%, 45%)" },
  ];

  const timelineData = [
    { month: "M1", cost: totalCost * 0.2 },
    { month: "M2", cost: totalCost * 0.35 },
    { month: "M3", cost: totalCost * 0.5 },
    { month: "M4", cost: totalCost * 0.7 },
    { month: "M5", cost: totalCost * 0.85 },
    { month: "M6", cost: totalCost },
  ];

  return (
    <Layout role="employee">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Dynamic Pricing Engine</h1>
          <p className="text-muted-foreground">Configure cost parameters and pricing structure</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pricing Controls */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6">Cost Parameters</h3>
              
              <div className="space-y-8">
                <div>
                  <Label>Resources ({resources[0]} units)</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    ${(resources[0] * baseRate * 160).toLocaleString()}
                  </p>
                  <Slider
                    value={resources}
                    onValueChange={setResources}
                    min={1}
                    max={20}
                    step={1}
                  />
                </div>

                <div>
                  <Label>Materials (${materials[0].toLocaleString()})</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Direct costs
                  </p>
                  <Slider
                    value={materials}
                    onValueChange={setMaterials}
                    min={10000}
                    max={200000}
                    step={5000}
                  />
                </div>

                <div>
                  <Label>Manpower ({manpower[0]} people)</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    ${(manpower[0] * 120 * 160).toLocaleString()}
                  </p>
                  <Slider
                    value={manpower}
                    onValueChange={setManpower}
                    min={1}
                    max={30}
                    step={1}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Total Project Cost</h3>
                  <p className="text-sm text-muted-foreground">Based on current parameters</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">
                    ${totalCost.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">USD</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Visualizations */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Cost Breakdown</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={costBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {costBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Cost Over Time</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                  <Line
                    type="monotone"
                    dataKey="cost"
                    stroke="hsl(220, 70%, 50%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(220, 70%, 50%)", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <Button onClick={() => {
            // Mark pricing as completed
            const completed = JSON.parse(localStorage.getItem("rfp-completed-stages") || "[]");
            if (!completed.includes("pricing")) {
              completed.push("pricing");
              localStorage.setItem("rfp-completed-stages", JSON.stringify(completed));
            }
            navigate("/employee/decision");
          }} size="lg">
            Proceed to Decision
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </Layout>
  );
}
