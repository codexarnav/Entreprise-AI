import { useState } from "react";
import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, Save } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function ProposalDrafting() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(
    "Executive Summary\n\nWe are pleased to submit our proposal in response to your Request for Proposal. Our team brings extensive experience in delivering comprehensive solutions that align with your requirements.\n\nProject Approach\n\nOur methodology focuses on a phased implementation approach that ensures minimal disruption to your operations while delivering maximum value. We will work closely with your team throughout the entire lifecycle.\n\nTechnical Solution\n\nOur proposed solution leverages industry-leading technologies and best practices to meet all specified requirements. The architecture is designed for scalability, security, and optimal performance.\n\nTimeline & Deliverables\n\nPhase 1: Discovery & Planning (4 weeks)\nPhase 2: Implementation (12 weeks)\nPhase 3: Testing & Deployment (4 weeks)\nPhase 4: Training & Support (2 weeks)"
  );
  const [progress] = useState(65);

  const handleAutoComplete = () => {
    setDraft(draft + "\n\n[AI-generated content would be added here...]");
  };

  const handleSave = () => {
    // Mark drafting as completed
    const completed = JSON.parse(localStorage.getItem("rfp-completed-stages") || "[]");
    if (!completed.includes("drafting")) {
      completed.push("drafting");
      localStorage.setItem("rfp-completed-stages", JSON.stringify(completed));
    }
    navigate("/employee/pricing");
  };

  return (
    <Layout role="employee">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Proposal Drafting</h1>
          <p className="text-muted-foreground">AI-assisted proposal creation</p>
          
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Draft Completion</span>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Requirements Summary */}
          <Card className="p-6 lg:col-span-1">
            <h3 className="text-lg font-semibold mb-4">Requirements Summary</h3>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium mb-1">Key Requirements</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Cloud infrastructure setup</li>
                  <li>Data migration services</li>
                  <li>24/7 support coverage</li>
                  <li>Compliance with ISO 27001</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-1">Technical Stack</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>React & TypeScript</li>
                  <li>Node.js backend</li>
                  <li>PostgreSQL database</li>
                  <li>AWS infrastructure</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-1">Timeline</h4>
                <p className="text-muted-foreground">22 weeks total</p>
              </div>

              <div>
                <h4 className="font-medium mb-1">Budget Range</h4>
                <p className="text-muted-foreground">$150K - $200K</p>
              </div>
            </div>
          </Card>

          {/* Draft Editor */}
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Proposal Draft</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoComplete}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Auto-Complete
              </Button>
            </div>

            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-h-[500px] font-mono text-sm"
              placeholder="Start writing your proposal..."
            />

            <div className="flex gap-4 mt-6">
              <Button variant="outline" onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                Save Draft
              </Button>
              <Button onClick={handleSave} className="gap-2 flex-1">
                Continue to Pricing
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      </motion.div>
    </Layout>
  );
}
