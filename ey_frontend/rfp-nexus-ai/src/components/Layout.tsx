import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Lightbulb, 
  Users, 
  LogOut,
  FileText,
  Menu
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface LayoutProps {
  children: ReactNode;
  role: "admin" | "employee";
}

export function Layout({ children, role }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("userRole");
    navigate("/");
  };

  const adminNav = [
    { path: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/innovation", label: "Innovation", icon: Lightbulb },
    { path: "/competitor", label: "Competitors", icon: Users },
  ];

  const employeeNav = [
    { path: "/employee/dashboard", label: "RFP Flow", icon: FileText },
    { path: "/innovation", label: "Innovation", icon: Lightbulb },
    { path: "/competitor", label: "Competitors", icon: Users },
  ];

  const navItems = role === "admin" ? adminNav : employeeNav;

  const NavLinks = () => (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        return (
          <Link key={item.path} to={item.path}>
            <Button
              variant={isActive ? "default" : "ghost"}
              className="w-full justify-start gap-2"
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Button>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b bg-card shadow-soft">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <div className="flex flex-col gap-4 mt-8">
                  <NavLinks />
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="justify-start gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            
            <Link to={role === "admin" ? "/admin/dashboard" : "/employee/dashboard"}>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                RFP Manager
              </h1>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-1">
              <NavLinks />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="hidden lg:flex gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4 lg:p-8">
        {children}
      </main>
    </div>
  );
}
