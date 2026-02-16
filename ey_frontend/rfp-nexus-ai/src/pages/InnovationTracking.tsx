import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Lightbulb, Plus, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const innovations = [
  {
    title: "AI-Powered Risk Prediction",
    impact: "High",
    owner: "Sarah Chen",
    progress: 75,
    status: "In Progress",
    category: "AI/ML",
  },
  {
    title: "Automated Compliance Checker",
    impact: "Medium",
    owner: "John Doe",
    progress: 90,
    status: "Testing",
    category: "Automation",
  },
  {
    title: "Real-time Collaboration Tools",
    impact: "High",
    owner: "Mike Wilson",
    progress: 45,
    status: "In Progress",
    category: "Platform",
  },
  {
    title: "Advanced Analytics Dashboard",
    impact: "Medium",
    owner: "Lisa Anderson",
    progress: 60,
    status: "In Progress",
    category: "Analytics",
  },
];

const adoptionData = [
  { month: "Jan", rate: 20 },
  { month: "Feb", rate: 35 },
  { month: "Mar", rate: 45 },
  { month: "Apr", rate: 60 },
  { month: "May", rate: 72 },
  { month: "Jun", rate: 85 },
];

const categoryData = [
  { name: "AI/ML", value: 35, color: "hsl(220, 70%, 50%)" },
  { name: "Automation", value: 30, color: "hsl(180, 70%, 50%)" },
  { name: "Platform", value: 20, color: "hsl(142, 71%, 45%)" },
  { name: "Analytics", value: 15, color: "hsl(38, 92%, 50%)" },
];

export default function InnovationTracking() {
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
            <h1 className="text-3xl font-bold mb-2">Innovation Tracking</h1>
            <p className="text-muted-foreground">
              Monitor ongoing innovations and automation improvements
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Innovation
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Adoption Rate</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={adoptionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="hsl(220, 70%, 50%)"
                  strokeWidth={2}
                  dot={{ fill: "hsl(220, 70%, 50%)", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">By Category</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-primary/10 to-accent/10">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-primary to-accent">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Efficiency Gain</p>
              <p className="text-4xl font-bold mb-2">+42%</p>
              <p className="text-sm text-muted-foreground">
                Compared to last quarter
              </p>
            </div>
          </Card>
        </div>

        <div className="grid gap-4">
          {innovations.map((innovation, index) => (
            <motion.div
              key={innovation.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="p-6 hover:shadow-medium transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-gradient-to-br from-primary to-accent">
                      <Lightbulb className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">{innovation.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Owner: {innovation.owner}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge>{innovation.category}</Badge>
                    <Badge
                      variant={
                        innovation.impact === "High" ? "default" : "secondary"
                      }
                    >
                      {innovation.impact} Impact
                    </Badge>
                    <Badge variant="outline">{innovation.status}</Badge>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {innovation.progress}%
                    </span>
                  </div>
                  <Progress value={innovation.progress} />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </Layout>
  );
}
