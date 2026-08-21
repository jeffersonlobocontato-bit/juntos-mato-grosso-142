import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTrackingQuestions } from '@/hooks/useTrackingRounds';
import { supabase } from '@/integrations/supabase/client';
import { GeoLocationInput, type GeoValue } from '@/components/ui/GeoLocationInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { ClipboardCheck, MapPin, User, CheckCircle, AlertTriangle, Loader2, LogOut } from 'lucide-react';

interface RoundData {
  id: string;
  title: string;
  description: string | null;
  city: string | null;
  state: string | null;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string;
  target_interviews: number;
}

const AGE_RANGES = ['16-17', '18-24', '25-34', '35-44', '45-59', '60+'];
const GENDERS = ['Masculino', 'Feminino', 'Outro', 'Prefiro não dizer'];
const EDUCATION = ['Fundamental incompleto', 'Fundamental completo', 'Médio incompleto', 'Médio completo', 'Superior incompleto', 'Superior completo', 'Pós-graduação'];
const INCOME = ['Até 1 SM', '1-2 SM', '2-3 SM', '3-5 SM', '5-10 SM', '10+ SM', 'Prefiro não dizer'];

export default function TrackingColeta() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const [round, setRound] = useState<RoundData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Demographics
  const [geo, setGeo] = useState<GeoValue>({ city: '', lat: null, lng: null });
  const [neighborhood, setNeighborhood] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [gender, setGender] = useState('');
  const [education, setEducation] = useState('');
  const [income, setIncome] = useState('');

  // Answers keyed by question_key
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [multiAnswers, setMultiAnswers] = useState<Record<string, string[]>>({});
  const [scaleAnswers, setScaleAnswers] = useState<Record<string, number>>({});

  // Load round by share code
  useEffect(() => {
    const loadRound = async () => {
      if (!shareCode) { setError('Código inválido'); setLoading(false); return; }
      const { data, error: err } = await (supabase as any)
        .from('tracking_rounds')
        .select('*')
        .eq('share_code', shareCode)
        .is('deleted_at', null)
        .single();

      if (err || !data) {
        setError('Rodada não encontrada ou link inválido.');
        setLoading(false);
        return;
      }

      if (data.status !== 'aberta') {
        setError('Esta rodada não está ativa no momento.');
        setLoading(false);
        return;
      }

      // Check date + time window
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);

      // Check if current date is within the round's date range
      if (data.start_date && todayStr < data.start_date) {
        setError(`Coleta disponível a partir de ${data.start_date}.`);
        setLoading(false);
        return;
      }
      if (data.end_date && todayStr > data.end_date) {
        setError('Esta rodada já foi encerrada.');
        setLoading(false);
        return;
      }

      // Check time window only on boundary days
      if (data.start_time && data.end_time) {
        const [sh, sm] = data.start_time.split(':').map(Number);
        const [eh, em] = data.end_time.split(':').map(Number);
        const currentMins = now.getHours() * 60 + now.getMinutes();
        const startMins = sh * 60 + sm;
        const endMins = eh * 60 + em;

        const isStartDay = todayStr === data.start_date;
        const isEndDay = todayStr === data.end_date;

        if (isStartDay && !isEndDay && currentMins < startMins) {
          setError(`Coleta disponível a partir das ${data.start_time.slice(0, 5)} de hoje.`);
          setLoading(false);
          return;
        }
        if (isEndDay && !isStartDay && currentMins > endMins) {
          setError(`Coleta encerrada às ${data.end_time.slice(0, 5)} de hoje.`);
          setLoading(false);
          return;
        }
        if (isStartDay && isEndDay && (currentMins < startMins || currentMins > endMins)) {
          setError(`Coleta disponível apenas entre ${data.start_time.slice(0, 5)} e ${data.end_time.slice(0, 5)}.`);
          setLoading(false);
          return;
        }
      }

      setRound(data);
      if (data.city) setGeo(prev => ({ ...prev, city: data.city }));
      setLoading(false);
    };
    loadRound();
  }, [shareCode]);

  const { data: questions = [] } = useTrackingQuestions(round?.id ?? null);

  // Check conditional visibility
  const isVisible = (q: any) => {
    if (!q.conditional_question_key || !q.conditional_value) return true;
    const depAnswer = answers[q.conditional_question_key] || multiAnswers[q.conditional_question_key]?.join(',') || '';
    return depAnswer.toLowerCase().includes(q.conditional_value.toLowerCase());
  };

  const visibleQuestions = questions.filter(isVisible);

  const handleSubmit = async () => {
    // Validate geo
    if (geo.lat === null || geo.lng === null) {
      toast({ title: 'Geolocalização obrigatória', description: 'Fixe sua localização antes de enviar.', variant: 'destructive' });
      return;
    }

    // Validate required questions
    for (const q of visibleQuestions) {
      if (!q.is_required) continue;
      const key = q.question_key;
      if (q.question_type === 'multiselect') {
        if (!multiAnswers[key]?.length) {
          toast({ title: 'Pergunta obrigatória', description: `Responda: "${q.label}"`, variant: 'destructive' });
          return;
        }
      } else if (q.question_type === 'scale') {
        // scale always has a value (default 5)
      } else {
        if (!answers[key]?.trim()) {
          toast({ title: 'Pergunta obrigatória', description: `Responda: "${q.label}"`, variant: 'destructive' });
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      // Insert interview
      const { data: interview, error: intErr } = await (supabase as any)
        .from('tracking_interviews')
        .insert({
          round_id: round!.id,
          interviewer_id: user!.id,
          lat: geo.lat,
          lng: geo.lng,
          municipality: geo.city || neighborhood || null,
          microregion: neighborhood || null,
          respondent_age_range: ageRange || null,
          respondent_gender: gender || null,
          respondent_education: education || null,
          respondent_income: income || null,
        })
        .select()
        .single();

      if (intErr) throw intErr;

      // Insert answers
      const answerRows: any[] = [];
      for (const q of visibleQuestions) {
        const key = q.question_key;
        let value = '';
        if (q.question_type === 'multiselect') {
          value = (multiAnswers[key] || []).join(', ');
        } else if (q.question_type === 'scale') {
          value = String(scaleAnswers[key] ?? 5);
        } else {
          value = answers[key] || '';
        }
        if (value) {
          answerRows.push({
            interview_id: interview.id,
            question_key: key,
            answer_value: value,
            candidate_name: q.question_type === 'select' ? value : null,
          });
        }
      }

      if (answerRows.length > 0) {
        const { error: ansErr } = await (supabase as any)
          .from('tracking_interview_answers')
          .insert(answerRows);
        if (ansErr) throw ansErr;
      }

      setSubmitted(true);
      toast({ title: 'Entrevista enviada com sucesso!' });
    } catch (e: any) {
      toast({ title: 'Erro ao enviar', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const startNew = () => {
    setSubmitted(false);
    setGeo({ city: round?.city || '', lat: null, lng: null });
    setNeighborhood('');
    setAgeRange('');
    setGender('');
    setEducation('');
    setIncome('');
    setAnswers({});
    setMultiAnswers({});
    setScaleAnswers({});
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-bold text-foreground mb-2">Acesso Indisponível</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Entrevista Registrada!</h2>
            <p className="text-sm text-muted-foreground mb-6">Dados salvos com sucesso.</p>
            <Button onClick={startNew} className="gap-2">
              <ClipboardCheck className="w-4 h-4" /> Nova Entrevista
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <ClipboardCheck className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-foreground truncate">{round?.title}</h1>
            {round?.city && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" /> {round.city}{round.state ? ` - ${round.state}` : ''}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            <User className="w-2.5 h-2.5 mr-1" />
            {user?.email?.split('@')[0]}
          </Badge>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={signOut}>
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-6 pb-24">
        {/* Step 1: Geolocation */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> 1. Localização
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <GeoLocationInput value={geo} onChange={setGeo} required label="Localização da Entrevista" />
            <div>
              <Label className="text-xs">Bairro</Label>
              <Input value={neighborhood} onChange={e => setNeighborhood(e.target.value)} placeholder="Nome do bairro" />
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Demographics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> 2. Perfil do Entrevistado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Faixa Etária</Label>
              <Select value={ageRange} onValueChange={setAgeRange}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {AGE_RANGES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Gênero</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Escolaridade</Label>
              <Select value={education} onValueChange={setEducation}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {EDUCATION.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Renda Familiar</Label>
              <Select value={income} onValueChange={setIncome}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {INCOME.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Questions */}
        {visibleQuestions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-primary" /> 3. Questionário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {visibleQuestions.map((q, idx) => {
                const opts = Array.isArray(q.options) ? q.options as string[] : [];
                return (
                  <div key={q.id} className="space-y-2">
                    <Label className="text-xs font-semibold">
                      {idx + 1}. {q.label}
                      {q.is_required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {q.description && <p className="text-[10px] text-muted-foreground">{q.description}</p>}

                    {/* Select (single choice) */}
                    {q.question_type === 'select' && (
                      <RadioGroup
                        value={answers[q.question_key] || ''}
                        onValueChange={v => setAnswers(prev => ({ ...prev, [q.question_key]: v }))}
                        className="space-y-1"
                      >
                        {opts.map(opt => (
                          <div key={opt} className="flex items-center gap-2">
                            <RadioGroupItem value={opt} id={`${q.question_key}-${opt}`} />
                            <Label htmlFor={`${q.question_key}-${opt}`} className="text-sm font-normal cursor-pointer">{opt}</Label>
                          </div>
                        ))}
                        {q.allow_other && (
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="__other__" id={`${q.question_key}-other`} />
                            <Input
                              placeholder="Outro..."
                              className="h-8 text-sm"
                              onFocus={() => setAnswers(prev => ({ ...prev, [q.question_key]: '__other__' }))}
                              onChange={e => setAnswers(prev => ({ ...prev, [q.question_key]: e.target.value }))}
                            />
                          </div>
                        )}
                      </RadioGroup>
                    )}

                    {/* Multiselect */}
                    {q.question_type === 'multiselect' && (
                      <div className="space-y-1">
                        {opts.map(opt => {
                          const checked = (multiAnswers[q.question_key] || []).includes(opt);
                          return (
                            <div key={opt} className="flex items-center gap-2">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={v => {
                                  setMultiAnswers(prev => {
                                    const curr = prev[q.question_key] || [];
                                    return { ...prev, [q.question_key]: v ? [...curr, opt] : curr.filter(x => x !== opt) };
                                  });
                                }}
                              />
                              <Label className="text-sm font-normal cursor-pointer">{opt}</Label>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Scale 0-10 */}
                    {q.question_type === 'scale' && (
                      <div className="space-y-2">
                        <Slider
                          min={0}
                          max={10}
                          step={1}
                          value={[scaleAnswers[q.question_key] ?? 5]}
                          onValueChange={([v]) => setScaleAnswers(prev => ({ ...prev, [q.question_key]: v }))}
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>0</span>
                          <span className="text-sm font-bold text-foreground">{scaleAnswers[q.question_key] ?? 5}</span>
                          <span>10</span>
                        </div>
                      </div>
                    )}

                    {/* Boolean */}
                    {q.question_type === 'boolean' && (
                      <RadioGroup
                        value={answers[q.question_key] || ''}
                        onValueChange={v => setAnswers(prev => ({ ...prev, [q.question_key]: v }))}
                        className="flex gap-4"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="Sim" id={`${q.question_key}-sim`} />
                          <Label htmlFor={`${q.question_key}-sim`} className="text-sm font-normal">Sim</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="Não" id={`${q.question_key}-nao`} />
                          <Label htmlFor={`${q.question_key}-nao`} className="text-sm font-normal">Não</Label>
                        </div>
                      </RadioGroup>
                    )}

                    {/* Text */}
                    {q.question_type === 'text' && (
                      <Textarea
                        value={answers[q.question_key] || ''}
                        onChange={e => setAnswers(prev => ({ ...prev, [q.question_key]: e.target.value }))}
                        placeholder="Digite sua resposta..."
                        rows={2}
                      />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full h-12 text-base font-bold gap-2"
        >
          {submitting ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</>
          ) : (
            <><CheckCircle className="w-5 h-5" /> Enviar Entrevista</>
          )}
        </Button>
      </div>
    </div>
  );
}
