import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StaleProposal {
  proposta_id: string;
  titulo: string;
  status: string;
  etapa: number;
  responsavel_id: string;
  responsavel_email: string;
  responsavel_nome: string;
  eixo_nome: string;
  municipio_nome: string;
  hours_stale: number;
  updated_at: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[proposal-stale-alert] Starting stale proposal check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get stale proposals (>48h without update, excluding approved)
    const { data: staleProposals, error: fetchError } = await supabase
      .rpc("get_stale_proposals", { hours_threshold: 48 });

    if (fetchError) {
      console.error("[proposal-stale-alert] Error fetching stale proposals:", fetchError);
      throw fetchError;
    }

    console.log(`[proposal-stale-alert] Found ${staleProposals?.length || 0} stale proposals`);

    const alertsSent: string[] = [];
    const alertsSkipped: string[] = [];

    // Process each stale proposal
    for (const proposal of (staleProposals || []) as StaleProposal[]) {
      console.log(`[proposal-stale-alert] Processing: ${proposal.titulo} (${proposal.hours_stale}h stale)`);

      // Check if alert was sent in the last 24 hours
      const { data: recentAlert } = await supabase
        .from("proposal_alerts")
        .select("sent_at")
        .eq("proposta_id", proposal.proposta_id)
        .order("sent_at", { ascending: false })
        .limit(1)
        .single();

      if (recentAlert) {
        const hoursSinceLastAlert = Math.floor(
          (Date.now() - new Date(recentAlert.sent_at).getTime()) / (1000 * 60 * 60)
        );

        if (hoursSinceLastAlert < 24) {
          console.log(`[proposal-stale-alert] Skipping ${proposal.titulo} - alert sent ${hoursSinceLastAlert}h ago`);
          alertsSkipped.push(proposal.proposta_id);
          continue;
        }
      }

      // Try to send email if Resend is configured
      let emailSent = false;
      if (resendApiKey && proposal.responsavel_email) {
        try {
          const resend = new Resend(resendApiKey);

          const emailResponse = await resend.emails.send({
            from: "Sistema Juntos Paraná 399 <alertas@resend.dev>",
            to: [proposal.responsavel_email],
            subject: `⚠️ Proposta aguardando ação: ${proposal.titulo}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc2626;">⚠️ Proposta com ${proposal.hours_stale}h sem atualização</h2>
                
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Título:</strong> ${proposal.titulo}</p>
                  <p><strong>Eixo:</strong> ${proposal.eixo_nome || 'N/A'}</p>
                  <p><strong>Município:</strong> ${proposal.municipio_nome || 'N/A'}</p>
                  <p><strong>Status atual:</strong> ${proposal.status}</p>
                  <p><strong>Etapa:</strong> ${proposal.etapa}/4</p>
                </div>
                
                <p style="color: #666;">
                  Esta proposta está aguardando ação há mais de 48 horas. 
                  Por favor, acesse o sistema e atualize o status para manter o fluxo de trabalho.
                </p>
                
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                  Este é um email automático do Sistema Juntos Paraná 399.
                </p>
              </div>
            `,
          });

          console.log(`[proposal-stale-alert] Email sent for ${proposal.titulo}:`, emailResponse);
          emailSent = true;
        } catch (emailError) {
          console.error(`[proposal-stale-alert] Failed to send email for ${proposal.titulo}:`, emailError);
        }
      } else {
        console.log(`[proposal-stale-alert] Resend not configured, skipping email for ${proposal.titulo}`);
      }

      // Record the alert in the database
      const { error: insertError } = await supabase.from("proposal_alerts").insert({
        proposta_id: proposal.proposta_id,
        responsavel_id: proposal.responsavel_id,
        alert_type: emailSent ? "email" : "system",
        hours_stale: proposal.hours_stale,
        metadata: {
          titulo: proposal.titulo,
          eixo: proposal.eixo_nome,
          municipio: proposal.municipio_nome,
          status: proposal.status,
          email_sent: emailSent,
          email_to: proposal.responsavel_email,
        },
      });

      if (insertError) {
        console.error(`[proposal-stale-alert] Error recording alert for ${proposal.titulo}:`, insertError);
      } else {
        alertsSent.push(proposal.proposta_id);
        console.log(`[proposal-stale-alert] Alert recorded for ${proposal.titulo}`);
      }
    }

    const summary = {
      total_stale: staleProposals?.length || 0,
      alerts_sent: alertsSent.length,
      alerts_skipped: alertsSkipped.length,
      resend_configured: !!resendApiKey,
    };

    console.log("[proposal-stale-alert] Summary:", summary);

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[proposal-stale-alert] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
