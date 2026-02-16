import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { Shield, AlertCircle, CheckCircle, ArrowRight } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";

const riskData = [
  { subject: "Timeline", score: 85 },
  { subject: "Budget", score: 70 },
  { subject: "Resources", score: 65 },
  { subject: "Technical", score: 90 },
  { subject: "Legal", score: 95 },
];

const complianceItems = [
  { title: "GDPR Compliance", status: "pass", description: "All data protection requirements met" },
  { title: "ISO 27001", status: "pass", description: "Information security standards compliant" },
  { title: "SOC 2 Type II", status: "warning", description: "Minor gaps in audit logging" },
];

const technicalFit = [
  { area: "Technology Stack", score: 95, status: "excellent" },
  { area: "Integration Capability", score: 80, status: "good" },
  { area: "Scalability", score: 85, status: "good" },
  { area: "Security Requirements", score: 90, status: "excellent" },
];

export default function RiskAnalysis() {
  const navigate = useNavigate();

  return (
    <Layout role="employee">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Risk & Compliance Analysis</h1>
          <p className="text-muted-foreground">AI-powered assessment of RFP requirements</p>
        </div>

        <Tabs defaultValue="risk" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="risk">Risk</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="technical">Technical Fit</TabsTrigger>
          </TabsList>

          <TabsContent value="risk" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-warning" />
                  Risk Assessment
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={riskData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar
                      name="Risk Score"
                      dataKey="score"
                      stroke="hsl(38, 92%, 50%)"
                      fill="hsl(38, 92%, 50%)"
                      fillOpacity={0.6}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Risk Breakdown</h3>
                <div className="space-y-4">
                  {riskData.map((item) => (
                    <div key={item.subject} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{item.subject}</span>
                        <Badge variant={item.score > 80 ? "default" : "secondary"}>
                          {item.score}%
                        </Badge>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-warning to-warning/80 transition-all"
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            <div className="grid gap-4">
              {complianceItems.map((item) => (
                <Card key={item.title} className="p-6">
                  <div className="flex items-start gap-4">
                    {item.status === "pass" ? (
                      <CheckCircle className="h-6 w-6 text-success mt-1" />
                    ) : (
                      <AlertCircle className="h-6 w-6 text-warning mt-1" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{item.title}</h3>
                        <Badge variant={item.status === "pass" ? "default" : "secondary"}>
                          {item.status === "pass" ? "Compliant" : "Review Required"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="technical" className="space-y-6">
            <div className="grid gap-4">
              {technicalFit.map((item) => (
                <Card key={item.area} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{item.area}</h3>
                    <Badge
                      variant={item.status === "excellent" ? "default" : "secondary"}
                    >
                      {item.score}%
                    </Badge>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${
                        item.status === "excellent"
                          ? "from-success to-success/80"
                          : "from-primary to-primary/80"
                      } transition-all`}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex justify-end">
          <Button onClick={() => {
            // Mark analysis as completed
            const completed = JSON.parse(localStorage.getItem("rfp-completed-stages") || "[]");
            if (!completed.includes("analysis")) {
              completed.push("analysis");
              localStorage.setItem("rfp-completed-stages", JSON.stringify(completed));
            }
            navigate("/employee/drafting");
          }} size="lg">
            Generate Proposal Draft
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </Layout>
  );
}
