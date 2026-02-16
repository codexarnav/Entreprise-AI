import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, ArrowRight, Globe, CheckCircle, Clock, XCircle, Mail } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { useToast } from "@/hooks/use-toast";

// Type for Gmail API
declare const gapi: any;

type RFPStatus = "pending" | "processed" | "failed";

interface UploadedRFP {
  id: string;
  fileName: string;
  clientName: string;
  deadline: string;
  source: string;
  status: RFPStatus;
  emailSubject?: string;
  emailSender?: string;
  emailDate?: string;
}

export default function RFPIngestion() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inputType, setInputType] = useState<"upload" | "scrape" | "gmail">("upload");
  const [urlInput, setUrlInput] = useState("");
  const [uploadedRFPs, setUploadedRFPs] = useState<UploadedRFP[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [isLoadingGmail, setIsLoadingGmail] = useState(false);
  const [gapiReady, setGapiReady] = useState(false);

  // Initialize Google API
  useEffect(() => {
    const loadGapi = () => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        (window as any).gapi.load('client:auth2', () => {
          (window as any).gapi.client.init({
            apiKey: 'AIzaSyBVl1K6XJ_qSYk3PqXl_PK_7F_HHXZ_ABC', // Replace with your API key
            clientId: 'YOUR_CLIENT_ID.apps.googleusercontent.com', // Replace with your client ID
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest'],
            scope: 'https://www.googleapis.com/auth/gmail.readonly'
          }).then(() => {
            setGapiReady(true);
            // Check if already signed in
            if ((window as any).gapi.auth2.getAuthInstance().isSignedIn.get()) {
              setIsGmailConnected(true);
            }
          });
        });
      };
      document.body.appendChild(script);
    };
    loadGapi();
  }, []);

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    
    const newRFPs: UploadedRFP[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      fileName: file.name,
      clientName: `Client ${Math.floor(Math.random() * 100)}`, // Auto-extracted placeholder
      deadline: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      source: "Manual Upload",
      status: "pending" as RFPStatus,
    }));

    setUploadedRFPs((prev) => [...prev, ...newRFPs]);

    // Simulate processing
    newRFPs.forEach((rfp) => {
      setTimeout(() => {
        setUploadedRFPs((prev) =>
          prev.map((r) =>
            r.id === rfp.id ? { ...r, status: Math.random() > 0.1 ? "processed" : "failed" } : r
          )
        );
      }, 1000 + Math.random() * 2000);
    });
  };

  const handleUrlScrape = () => {
    if (!urlInput) return;

    const newRFP: UploadedRFP = {
      id: Math.random().toString(36).substr(2, 9),
      fileName: `RFP from ${new URL(urlInput).hostname}`,
      clientName: `Client ${Math.floor(Math.random() * 100)}`,
      deadline: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      source: "Web Scrape",
      status: "pending" as RFPStatus,
    };

    setUploadedRFPs((prev) => [...prev, newRFP]);
    setUrlInput("");

    // Simulate processing
    setTimeout(() => {
      setUploadedRFPs((prev) =>
        prev.map((r) =>
          r.id === newRFP.id ? { ...r, status: Math.random() > 0.1 ? "processed" : "failed" } : r
        )
      );
    }, 1500 + Math.random() * 2000);
  };

  const handleGmailConnect = async () => {
    if (!gapiReady) {
      toast({
        title: "Error",
        description: "Gmail API is still loading. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      const authInstance = (window as any).gapi.auth2.getAuthInstance();
      await authInstance.signIn();
      setIsGmailConnected(true);
      toast({
        title: "Connected!",
        description: "Gmail account connected successfully.",
      });
      fetchGmailRFPs();
    } catch (error) {
      console.error('Gmail authentication error:', error);
      toast({
        title: "Connection Failed",
        description: "Could not connect to Gmail. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fetchGmailRFPs = async () => {
    setIsLoadingGmail(true);
    try {
      const response = await (window as any).gapi.client.gmail.users.messages.list({
        userId: 'me',
        q: 'subject:(RFP OR Proposal OR Tender OR "Request for Proposal") has:attachment',
        maxResults: 10
      });

      const messages = response.result.messages || [];
      
      const rfpPromises = messages.map(async (message: any) => {
        const detail = await (window as any).gapi.client.gmail.users.messages.get({
          userId: 'me',
          id: message.id
        });

        const headers = detail.result.payload.headers;
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
        const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown Sender';
        const date = headers.find((h: any) => h.name === 'Date')?.value || new Date().toISOString();

        return {
          id: message.id,
          fileName: subject,
          clientName: from.split('<')[0].trim(),
          deadline: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          source: "Gmail",
          status: "pending" as RFPStatus,
          emailSubject: subject,
          emailSender: from,
          emailDate: new Date(date).toLocaleDateString(),
        };
      });

      const newRFPs = await Promise.all(rfpPromises);
      setUploadedRFPs((prev) => [...prev, ...newRFPs]);

      // Simulate processing
      newRFPs.forEach((rfp) => {
        setTimeout(() => {
          setUploadedRFPs((prev) =>
            prev.map((r) =>
              r.id === rfp.id ? { ...r, status: Math.random() > 0.1 ? "processed" : "failed" } : r
            )
          );
        }, 1000 + Math.random() * 2000);
      });

      toast({
        title: "Emails Fetched",
        description: `Found ${newRFPs.length} potential RFP emails.`,
      });
    } catch (error) {
      console.error('Error fetching Gmail messages:', error);
      toast({
        title: "Fetch Failed",
        description: "Could not fetch emails from Gmail.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingGmail(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleContinue = () => {
    const completed = JSON.parse(localStorage.getItem("rfp-completed-stages") || "[]");
    if (!completed.includes("ingestion")) {
      completed.push("ingestion");
      localStorage.setItem("rfp-completed-stages", JSON.stringify(completed));
    }
    navigate("/employee/analysis");
  };

  // Dynamic chart data based on uploaded RFPs
  const sourceData = [
    { name: "Email", value: uploadedRFPs.filter(r => r.source === "Email").length || 35, color: "hsl(220, 70%, 50%)" },
    { name: "Portal", value: uploadedRFPs.filter(r => r.source === "Portal").length || 45, color: "hsl(180, 70%, 50%)" },
    { name: "Manual Upload", value: uploadedRFPs.filter(r => r.source === "Manual Upload").length, color: "hsl(142, 71%, 45%)" },
    { name: "Web Scrape", value: uploadedRFPs.filter(r => r.source === "Web Scrape").length, color: "hsl(280, 70%, 50%)" },
    { name: "Gmail", value: uploadedRFPs.filter(r => r.source === "Gmail").length, color: "hsl(340, 70%, 50%)" },
  ].filter(d => d.value > 0);

  const getDeadlineCategory = (deadline: string) => {
    const days = Math.floor((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 7) return "< 7 days";
    if (days < 15) return "7-14 days";
    if (days < 30) return "15-30 days";
    return "> 30 days";
  };

  const deadlineData = [
    { name: "< 7 days", count: uploadedRFPs.filter(r => getDeadlineCategory(r.deadline) === "< 7 days").length || 5 },
    { name: "7-14 days", count: uploadedRFPs.filter(r => getDeadlineCategory(r.deadline) === "7-14 days").length || 12 },
    { name: "15-30 days", count: uploadedRFPs.filter(r => getDeadlineCategory(r.deadline) === "15-30 days").length || 8 },
    { name: "> 30 days", count: uploadedRFPs.filter(r => getDeadlineCategory(r.deadline) === "> 30 days").length || 3 },
  ];

  const getStatusIcon = (status: RFPStatus) => {
    switch (status) {
      case "processed":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "pending":
        return <Clock className="h-4 w-4 text-warning" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: RFPStatus) => {
    const variants = {
      processed: "default",
      pending: "secondary",
      failed: "destructive",
    };
    return (
      <Badge variant={variants[status] as any} className="capitalize">
        {status}
      </Badge>
    );
  };

  return (
    <Layout role="employee">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">RFP Ingestion</h1>
          <p className="text-muted-foreground">Upload and parse your RFP documents</p>
        </div>

        <div className="space-y-6">
          {/* Upload Section */}
          <Card className="p-6">
              <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  RFP Ingestion
                </h2>
                <div className="w-48">
                  <Select value={inputType} onValueChange={(v) => setInputType(v as "upload" | "scrape" | "gmail")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upload">Manual Upload</SelectItem>
                      <SelectItem value="scrape">Scrape from Internet</SelectItem>
                      <SelectItem value="gmail">Gmail</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {inputType === "upload" ? (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.docx,.doc"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files)}
                  />
                  <div
                    className={`flex items-center justify-center border-2 border-dashed rounded-lg p-12 transition-all cursor-pointer ${
                      isDragging
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary hover:bg-accent/50"
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="text-center">
                      <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                      <p className="text-sm font-medium text-foreground mb-1">
                        Drop multiple RFP files here or click to upload
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Supports PDF, DOCX - Upload multiple files at once
                      </p>
                    </div>
                  </div>
                </>
              ) : inputType === "scrape" ? (
                <div className="space-y-3">
                  <Label htmlFor="url">Enter RFP URL</Label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="url"
                        type="url"
                        placeholder="https://example.com/rfp-document"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Button onClick={handleUrlScrape} disabled={!urlInput}>
                      Scrape
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Label>Connect Gmail Account</Label>
                  <div className="flex items-center justify-center border-2 border-dashed rounded-lg p-12 transition-all">
                    <div className="text-center">
                      <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                      {!isGmailConnected ? (
                        <>
                          <p className="text-sm font-medium text-foreground mb-3">
                            Connect your Gmail to automatically fetch RFP emails
                          </p>
                          <Button onClick={handleGmailConnect} disabled={!gapiReady}>
                            <Mail className="mr-2 h-4 w-4" />
                            Connect Gmail
                          </Button>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-foreground mb-3">
                            Gmail connected successfully
                          </p>
                          <Button onClick={fetchGmailRFPs} disabled={isLoadingGmail}>
                            {isLoadingGmail ? "Fetching..." : "Fetch RFP Emails"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Uploaded RFPs Table */}
          {uploadedRFPs.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Uploaded RFPs ({uploadedRFPs.length})</h3>
                <Button onClick={handleContinue} disabled={uploadedRFPs.some(r => r.status === "pending")}>
                  Continue to Analysis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Client Name</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadedRFPs.map((rfp) => (
                      <TableRow key={rfp.id}>
                        <TableCell className="font-medium">
                          {rfp.fileName}
                          {rfp.emailDate && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Received: {rfp.emailDate}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {rfp.clientName}
                          {rfp.emailSender && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {rfp.emailSender}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{new Date(rfp.deadline).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{rfp.source}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {getStatusIcon(rfp.status)}
                            {getStatusBadge(rfp.status)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}

          {/* Analytics Grid */}
          <div className="grid gap-6 md:grid-cols-2">
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
          </div>
        </div>
      </motion.div>
    </Layout>
  );
}
