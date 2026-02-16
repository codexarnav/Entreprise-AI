import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, TrendingUp, Shield, DollarSign, FileText } from "lucide-react";

const summaryData = [
  {
    category: "Risk Assessment",
    icon: Shield,
    score: 85,
    status: "good",
    details: "Low to medium risk across all areas",
  },
  {
    category: "Technical Fit",
    icon: TrendingUp,
    score: 90,
    status: "excellent",
    details: "Excellent alignment with requirements",
  },
  {
    category: "Pricing",
    icon: DollarSign,
    score: 75,
    status: "good",
    details: "Competitive pricing within budget",
  },
  {
    category: "Proposal Quality",
    icon: FileText,
    score: 88,
    status: "excellent",
    details: "Comprehensive and well-structured",
  },
];

export default function GoNoGoDecision() {
  const navigate = useNavigate();

  const handleDecision = (decision: "go" | "no-go") => {
    // Mark decision as completed
    const completed = JSON.parse(localStorage.getItem("rfp-completed-stages") || "[]");
    if (!completed.includes("decision")) {
      completed.push("decision");
      localStorage.setItem("rfp-completed-stages", JSON.stringify(completed));
    }
    
    if (decision === "go") {
      navigate("/employee/submission");
    } else {
      // Handle no-go decision (could navigate to archive or dashboard)
      navigate("/employee/dashboard");
    }
  };

  return (
    <Layout role="employee">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Go/No-Go Decision</h1>
          <p className="text-muted-foreground">Review all metrics and make the final call</p>
        </div>

        <div className="grid gap-6 mb-8">
          {summaryData.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.category}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`p-3 rounded-lg bg-gradient-to-br ${
                        item.status === "excellent"
                          ? "from-success to-success/80"
                          : "from-primary to-primary/80"
                      }`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{item.category}</h3>
                        <p className="text-sm text-muted-foreground">{item.details}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{item.score}%</div>
                        <Badge variant={item.status === "excellent" ? "default" : "secondary"}>
                          {item.status}
                        </Badge>
                      </div>
                      <div className="w-32 h-32">
                        <svg viewBox="0 0 100 100" className="transform -rotate-90">
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke="hsl(var(--muted))"
                            strokeWidth="10"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke={
                              item.status === "excellent"
                                ? "hsl(142, 71%, 45%)"
                                : "hsl(220, 70%, 50%)"
                            }
                            strokeWidth="10"
                            strokeDasharray={`${item.score * 2.827} ${282.7}`}
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <Card className="p-8 bg-gradient-to-br from-card to-muted/20">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Make Your Decision</h2>
            <p className="text-muted-foreground">
              Based on the analysis above, choose whether to proceed with this RFP
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 max-w-2xl mx-auto">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                className="w-full h-24 text-lg gap-3"
                onClick={() => handleDecision("go")}
              >
                <CheckCircle className="h-6 w-6" />
                Go - Submit Proposal
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                variant="outline"
                className="w-full h-24 text-lg gap-3"
                onClick={() => handleDecision("no-go")}
              >
                <XCircle className="h-6 w-6" />
                No-Go - Archive RFP
              </Button>
            </motion.div>
          </div>
        </Card>
      </motion.div>
    </Layout>
  );
}
