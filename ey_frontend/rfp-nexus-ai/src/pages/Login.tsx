import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserCircle, Shield } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<"admin" | "employee" | null>(null);

  const handleLogin = () => {
    if (selectedRole) {
      localStorage.setItem("userRole", selectedRole);
      if (selectedRole === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/employee/dashboard");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-md p-8 shadow-strong">
          <div className="text-center mb-8">
            <motion.h1
              className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              RFP Manager Pro
            </motion.h1>
            <p className="text-muted-foreground">Select your role to continue</p>
          </div>

          <div className="space-y-4 mb-6">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className={`p-6 cursor-pointer transition-all ${
                  selectedRole === "employee"
                    ? "border-primary bg-primary/5 shadow-medium"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => setSelectedRole("employee")}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <UserCircle className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Employee</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage RFP lifecycle and proposals
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className={`p-6 cursor-pointer transition-all ${
                  selectedRole === "admin"
                    ? "border-primary bg-primary/5 shadow-medium"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => setSelectedRole("admin")}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-accent/10">
                    <Shield className="h-8 w-8 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Admin</h3>
                    <p className="text-sm text-muted-foreground">
                      View analytics and manage insights
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>

          <Button
            onClick={handleLogin}
            disabled={!selectedRole}
            className="w-full"
            size="lg"
          >
            Continue as {selectedRole || "..."}
          </Button>
        </Card>
      </motion.div>
    </div>
  );
}
