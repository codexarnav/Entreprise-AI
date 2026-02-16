import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle, Clock, XCircle, TrendingUp, AlertCircle } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const stats = [
  { label: "Active RFPs", value: 12, icon: Clock, color: "from-primary to-primary/80" },
  { label: "Completed", value: 34, icon: CheckCircle, color: "from-success to-success/80" },
  { label: "In Progress", value: 8, icon: FileText, color: "from-accent to-accent/80" },
  { label: "Archived", value: 5, icon: XCircle, color: "from-secondary to-secondary/80" },
];

const sourceData = [
  { name: "Email", value: 35, color: "hsl(220, 70%, 50%)" },
  { name: "Portal", value: 45, color: "hsl(180, 70%, 50%)" },
  { name: "Direct", value: 20, color: "hsl(142, 71%, 45%)" },
];

const performanceData = [
  { month: "Jan", winRate: 65, avgTime: 18 },
  { month: "Feb", winRate: 72, avgTime: 16 },
  { month: "Mar", winRate: 68, avgTime: 17 },
  { month: "Apr", winRate: 78, avgTime: 15 },
  { month: "May", winRate: 75, avgTime: 14 },
  { month: "Jun", winRate: 82, avgTime: 13 },
];

const riskTrend = [
  { category: "High Risk", count: 3 },
  { category: "Medium Risk", count: 12 },
  { category: "Low Risk", count: 19 },
];

const insights = [
  {
    title: "High-risk RFPs trending this week",
    description: "3 new high-risk proposals require immediate attention",
    type: "warning",
  },
  {
    title: "Improved win rate",
    description: "Win rate increased by 15% compared to last month",
    type: "success",
  },
  {
    title: "Compliance gaps detected",
    description: "2 proposals need compliance review before submission",
    type: "warning",
  },
];

export default function AdminDashboard() {
  return (
    <Layout role="admin">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive overview of all RFP activities and insights
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-lg bg-gradient-to-br ${stat.color}`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="winRate"
                  stroke="hsl(220, 70%, 50%)"
                  name="Win Rate %"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avgTime"
                  stroke="hsl(180, 70%, 50%)"
                  name="Avg Time (days)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">RFPs by Source</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  dataKey="value"
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Risk Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={riskTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                  <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="count" fill="hsl(220, 70%, 50%)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">AI Insight Feed</h3>
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  {insight.type === "warning" ? (
                    <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                  ) : (
                    <TrendingUp className="h-5 w-5 text-success mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium text-sm mb-1">{insight.title}</h4>
                    <p className="text-xs text-muted-foreground">{insight.description}</p>
                  </div>
                  <Badge variant={insight.type === "warning" ? "secondary" : "default"}>
                    {insight.type}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </motion.div>
    </Layout>
  );
}
