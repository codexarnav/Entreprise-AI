import { useEffect } from "react";
import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Download, Share2, Home } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import confetti from "canvas-confetti";

export default function FinalSubmission() {
  const navigate = useNavigate();

  useEffect(() => {
    // Mark submission as completed
    const completed = JSON.parse(localStorage.getItem("rfp-completed-stages") || "[]");
    if (!completed.includes("submission")) {
      completed.push("submission");
      localStorage.setItem("rfp-completed-stages", JSON.stringify(completed));
    }
    
    // Trigger confetti animation
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  }, []);

  return (
    <Layout role="employee">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto"
      >
        <Card className="p-12 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-success to-success/80 flex items-center justify-center mb-6"
          >
            <CheckCircle className="h-12 w-12 text-white" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold mb-4"
          >
            Submission Complete!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-muted-foreground mb-8"
          >
            Your RFP proposal has been successfully submitted
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Process Completion</span>
              <span className="text-sm text-muted-foreground">100%</span>
            </div>
            <Progress value={100} className="h-3" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid gap-4 mb-8"
          >
            <Card className="p-4 text-left">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Submission ID</p>
                  <p className="font-semibold">RFP-2025-001</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-semibold">{new Date().toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Cost</p>
                  <p className="font-semibold">$185,000</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Timeline</p>
                  <p className="font-semibold">22 weeks</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Download Summary
            </Button>
            <Button variant="outline" className="gap-2">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button onClick={() => navigate("/employee/dashboard")} className="gap-2">
              <Home className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </motion.div>
        </Card>
      </motion.div>
    </Layout>
  );
}
