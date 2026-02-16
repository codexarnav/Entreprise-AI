import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  Shield, 
  FileEdit, 
  DollarSign, 
  CheckCircle, 
  Send,
  ChevronRight,
  Lock,
  Lightbulb
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

const stages = [
  {
    id: "ingestion",
    title: "RFP Ingestion",
    description: "Upload and parse RFP documents",
    icon: Upload,
    path: "/employee/ingestion",
    color: "from-primary to-primary/80",
    order: 0,
  },
  {
    id: "analysis",
    title: "Risk & Compliance",
    description: "Analyze risks and technical fit",
    icon: Shield,
    path: "/employee/analysis",
    color: "from-warning to-warning/80",
    order: 1,
  },
  {
    id: "drafting",
    title: "Proposal Drafting",
    description: "AI-assisted proposal creation",
    icon: FileEdit,
    path: "/employee/drafting",
    color: "from-accent to-accent/80",
    order: 2,
  },
  {
    id: "pricing",
    title: "Dynamic Pricing",
    description: "Configure cost parameters",
    icon: DollarSign,
    path: "/employee/pricing",
    color: "from-success to-success/80",
    order: 3,
  },
  {
    id: "decision",
    title: "Go/No-Go",
    description: "Make the final decision",
    icon: CheckCircle,
    path: "/employee/decision",
    color: "from-secondary to-secondary/80",
    order: 4,
  },
  {
    id: "submission",
    title: "Submission",
    description: "Finalize and submit",
    icon: Send,
    path: "/employee/submission",
    color: "from-primary to-accent",
    order: 5,
  },
];

const sourceData = [
  { name: "Email", value: 35, color: "hsl(220, 70%, 50%)" },
  { name: "Portal", value: 45, color: "hsl(180, 70%, 50%)" },
  { name: "Direct", value: 20, color: "hsl(142, 71%, 45%)" },
];

const deadlineData = [
  { name: "< 7 days", count: 5 },
  { name: "7-14 days", count: 12 },
  { name: "15-30 days", count: 8 },
  { name: "> 30 days", count: 3 },
];

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  
  // Load completion state from localStorage
  const [completedStages, setCompletedStages] = useState<string[]>(() => {
    const saved = localStorage.getItem("rfp-completed-stages");
    return saved ? JSON.parse(saved) : [];
  });

  // Save to localStorage whenever completedStages changes
  useEffect(() => {
    localStorage.setItem("rfp-completed-stages", JSON.stringify(completedStages));
  }, [completedStages]);

  // Calculate progress
  const progress = (completedStages.length / stages.length) * 100;

  // Determine if a stage is unlocked
  const isStageUnlocked = (stageOrder: number) => {
    if (stageOrder === 0) return true; // First stage always unlocked
    const previousStage = stages.find(s => s.order === stageOrder - 1);
    return previousStage ? completedStages.includes(previousStage.id) : false;
  };

  // Determine stage status
  const getStageStatus = (stage: typeof stages[0]) => {
    if (completedStages.includes(stage.id)) return "completed";
    if (isStageUnlocked(stage.order)) return "unlocked";
    return "locked";
  };

  // Handle stage navigation
  const handleStageClick = (stage: typeof stages[0]) => {
    const status = getStageStatus(stage);
    if (status !== "locked") {
      navigate(stage.path);
    }
  };

  // Show onboarding tip only if no stages completed
  const showOnboarding = completedStages.length === 0;

  return (
    <Layout role="employee">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">RFP Lifecycle</h1>
              <p className="text-muted-foreground">
                Follow the step-by-step process to manage your RFP from start to finish
              </p>
            </div>
            {completedStages.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCompletedStages([]);
                  localStorage.removeItem("rfp-completed-stages");
                }}
              >
                Reset Progress
              </Button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">
                {completedStages.length} of {stages.length} stages
              </span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Onboarding Tip */}
          <AnimatePresence>
            {showOnboarding && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="p-4 mb-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <Lightbulb className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Get Started</h3>
                      <p className="text-sm text-muted-foreground">
                        Start by uploading your RFP to begin the process. Each stage will unlock automatically as you complete the previous one.
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Summary Graphs - Show after ingestion */}
        <AnimatePresence>
          {completedStages.includes("ingestion") && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.5 }}
              className="grid gap-6 md:grid-cols-2 mb-8"
            >
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">RFPs by Source</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
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
                <h3 className="text-lg font-semibold mb-4">Deadlines by Proximity</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={deadlineData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(220, 70%, 50%)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stage Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {stages.map((stage, index) => {
              const Icon = stage.icon;
              const status = getStageStatus(stage);
              const isLocked = status === "locked";
              const isCompleted = status === "completed";
              const isUnlocked = status === "unlocked";

              return (
                <motion.div
                  key={stage.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ 
                    opacity: isLocked ? 0.5 : 1, 
                    scale: 1,
                    transition: { delay: index * 0.1, duration: 0.5 }
                  }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileHover={!isLocked ? { scale: 1.02 } : {}}
                  className={stage.order === 0 && showOnboarding ? "md:col-span-2 lg:col-span-3" : ""}
                >
                  <Card 
                    className={`group relative overflow-hidden p-6 transition-all ${
                      isLocked 
                        ? "cursor-not-allowed" 
                        : "cursor-pointer hover:shadow-medium"
                    } ${
                      isCompleted ? "border-success" : ""
                    } ${
                      isUnlocked && !isCompleted ? "border-primary" : ""
                    }`}
                    onClick={() => handleStageClick(stage)}
                  >
                    {/* Locked Overlay */}
                    {isLocked && (
                      <div className="absolute inset-0 backdrop-blur-[2px] bg-background/50 z-10 flex items-center justify-center">
                        <div className="text-center">
                          <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm font-medium text-muted-foreground">
                            Complete previous step to unlock
                          </p>
                        </div>
                      </div>
                    )}

                    <div
                      className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${stage.color}`}
                    />
                    
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-lg bg-gradient-to-br ${stage.color} relative`}>
                        <Icon className="h-6 w-6 text-white" />
                        {isCompleted && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-1 -right-1 bg-success rounded-full p-1"
                          >
                            <CheckCircle className="h-4 w-4 text-white" />
                          </motion.div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-2xl font-bold text-muted-foreground">
                          {index + 1}
                        </div>
                        {isCompleted && (
                          <Badge variant="default">Completed</Badge>
                        )}
                        {isUnlocked && !isCompleted && (
                          <Badge variant="secondary">Unlocked</Badge>
                        )}
                        {isLocked && (
                          <Badge variant="outline">Locked</Badge>
                        )}
                      </div>
                    </div>

                    <h3 className="text-xl font-semibold mb-2">{stage.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {stage.description}
                    </p>

                    <Button
                      variant={isLocked ? "outline" : "ghost"}
                      className={`w-full justify-between ${
                        !isLocked && "group-hover:bg-primary/10"
                      }`}
                      disabled={isLocked}
                    >
                      {isCompleted ? "Review" : isUnlocked ? "Start Stage" : "Locked"}
                      {!isLocked && (
                        <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      )}
                    </Button>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>
    </Layout>
  );
}
