import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  MapPin, 
  FileText, 
  Users, 
  Target, 
  TrendingUp, 
  Filter,
  BarChart3,
  PieChart,
  ArrowLeft,
  Download,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import PublicParanaHeatmap from "@/components/dashboard/PublicParanaHeatmap";

const proposalsByEixo = [
  { name: "Social", propostas: 124, sugestoes: 456 },
  { name: "Econômico", propostas: 98, sugestoes: 389 },
  { name: "Infraestrutura", propostas: 87, sugestoes: 298 },
  { name: "Gestão", propostas: 76, sugestoes: 267 },
  { name: "Segurança", propostas: 65, sugestoes: 234 },
];

const statusData = [
  { name: "Rascunho", value: 124, color: "hsl(var(--muted-foreground))" },
  { name: "Em Análise", value: 485, color: "hsl(var(--primary))" },
  { name: "Aprovada", value: 238, color: "hsl(var(--accent))" },
];

const timelineData = [
  { month: "Jun", propostas: 45, sugestoes: 120 },
  { month: "Jul", propostas: 89, sugestoes: 345 },
  { month: "Ago", propostas: 156, sugestoes: 567 },
  { month: "Set", propostas: 234, sugestoes: 890 },
  { month: "Out", propostas: 387, sugestoes: 1234 },
  { month: "Nov", propostas: 567, sugestoes: 1890 },
  { month: "Dez", propostas: 847, sugestoes: 3254 },
];

const topMunicipios = [
  { name: "Curitiba", total: 279, percent: 8.5 },
  { name: "Londrina", total: 188, percent: 5.8 },
  { name: "Maringá", total: 170, percent: 5.2 },
  { name: "Cascavel", total: 122, percent: 3.7 },
  { name: "Ponta Grossa", total: 134, percent: 4.1 },
];

const Dashboard = () => {
  const [selectedEixo, setSelectedEixo] = useState("todos");
  const [selectedPeriodo, setSelectedPeriodo] = useState("todos");

  const stats = [
    { icon: FileText, value: "847", label: "Propostas Técnicas", trend: "+12%", color: "primary" },
    { icon: Users, value: "3.254", label: "Sugestões Populares", trend: "+28%", color: "secondary" },
    { icon: MapPin, value: "267", label: "Municípios Ativos", sublabel: "/399", color: "accent" },
    { icon: Target, value: "5", label: "Eixos Temáticos", trend: "100%", color: "primary" },
  ];

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </Button>
              </Link>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-primary-foreground" />
                </div>
                <h1 className="font-display font-bold text-lg text-foreground">Dashboard Público</h1>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Select value={selectedEixo} onValueChange={setSelectedEixo}>
                <SelectTrigger className="w-[180px] h-9">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Eixo Temático" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Eixos</SelectItem>
                  <SelectItem value="social">Desenv. Social</SelectItem>
                  <SelectItem value="economico">Desenv. Econômico</SelectItem>
                  <SelectItem value="infraestrutura">Cidades e Infraestrutura</SelectItem>
                  <SelectItem value="gestao">Gestão Pública</SelectItem>
                  <SelectItem value="seguranca">Segurança e Justiça</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Exportar
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card variant="stat" className="h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl ${
                      stat.color === "primary" ? "bg-primary/10" : 
                      stat.color === "secondary" ? "bg-secondary/10" : 
                      "bg-accent/10"
                    } flex items-center justify-center`}>
                      <stat.icon className={`w-6 h-6 ${
                        stat.color === "primary" ? "text-primary" : 
                        stat.color === "secondary" ? "text-secondary" : 
                        "text-accent"
                      }`} />
                    </div>
                    {stat.trend && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                        <TrendingUp className="w-3 h-3" />
                        {stat.trend}
                      </span>
                    )}
                  </div>
                  <div className="font-display text-3xl font-bold text-foreground mb-1">
                    {stat.value}
                    {stat.sublabel && <span className="text-muted-foreground text-lg">{stat.sublabel}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Timeline Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="lg:col-span-2"
          >
            <Card variant="default" className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Evolução ao Longo do Tempo
                  </CardTitle>
                  <Select value={selectedPeriodo} onValueChange={setSelectedPeriodo}>
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Último ano</SelectItem>
                      <SelectItem value="6m">6 meses</SelectItem>
                      <SelectItem value="3m">3 meses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="propostas"
                        name="Propostas Técnicas"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="sugestoes"
                        name="Sugestões Populares"
                        stroke="hsl(var(--secondary))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--secondary))", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Status Pie Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <Card variant="default" className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-secondary" />
                  Status das Propostas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {statusData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs text-muted-foreground">{item.name}</span>
                      <span className="text-xs font-medium text-foreground ml-auto">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Heatmap Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.8 }}
          className="mb-8"
        >
          <PublicParanaHeatmap />
        </motion.div>

        {/* Charts Row 2 */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Bar Chart by Eixo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="lg:col-span-2"
          >
            <Card variant="default">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Distribuição por Eixo Temático
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={proposalsByEixo} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={90} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="propostas" name="Propostas" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="sugestoes" name="Sugestões" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Top Municipalities */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.7 }}
          >
            <Card variant="default" className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-accent" />
                  Top Municípios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topMunicipios.map((mun, index) => (
                    <div key={mun.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {index + 1}
                          </span>
                          <span className="font-medium text-foreground">{mun.name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{mun.total}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all"
                          style={{ width: `${mun.percent * 10}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
