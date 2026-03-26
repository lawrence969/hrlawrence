import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderNumber, clientName, clientEmail, message } = await req.json();

    if (!orderNumber || !clientEmail || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all staff/admin users to notify
    const { data: staffRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "staff"]);

    if (!staffRoles || staffRoles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Message received" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const staffUserIds = staffRoles.map((r: any) => r.user_id);
    const { data: staffProfiles } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .in("user_id", staffUserIds);

    const staffEmails = staffProfiles?.map((p: any) => p.email).filter(Boolean) || [];

    if (staffEmails.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Message received" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const senderName = clientName?.trim() || "Client";
    const subject = `Order Inquiry – ${orderNumber} from ${senderName}`;
    const html = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1a2a3a; font-size: 22px; margin-bottom: 24px;">New Order Inquiry</h1>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px; width: 120px;">Order</td>
            <td style="padding: 8px 0; color: #1a2a3a; font-size: 14px; font-weight: bold;">${orderNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;">Client</td>
            <td style="padding: 8px 0; color: #1a2a3a; font-size: 14px;">${clientName || "Not provided"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;">Email</td>
            <td style="padding: 8px 0; color: #1a2a3a; font-size: 14px;"><a href="mailto:${clientEmail}" style="color: #8b7355;">${clientEmail}</a></td>
          </tr>
        </table>
        <div style="background: #f8f7f5; padding: 20px; margin-bottom: 24px;">
          <p style="color: #666; font-size: 12px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.1em;">Message</p>
          <p style="color: #1a2a3a; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${message}</p>
        </div>
        <p style="color: #666; font-size: 13px; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
          This inquiry was sent from the Track Your Order page on H.R. Lawrence Fine Jewelry.
        </p>
      </div>
    `;
    const text = [
      "New Order Inquiry",
      `Order: ${orderNumber}`,
      `Client: ${clientName || "Not provided"}`,
      `Email: ${clientEmail}`,
      "",
      "Message:",
      message,
      "",
      "This inquiry was sent from the Track Your Order page on H.R. Lawrence Fine Jewelry.",
    ].join("\n");

    for (const staffEmail of staffEmails) {
      const messageId = crypto.randomUUID();
      const { error: enqueueErr } = await supabaseAdmin.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          to: staffEmail,
          from: "HR Lawrence <noreply@notify.hrlawrence.com>",
          sender_domain: "notify.hrlawrence.com",
          subject,
          html,
          text,
          purpose: "transactional",
          label: "order-inquiry",
          message_id: messageId,
          idempotency_key: `order-inquiry-${orderNumber}-${messageId}`,
          queued_at: new Date().toISOString(),
        },
      });

      if (enqueueErr) {
        console.error(`Failed to enqueue email for ${staffEmail}:`, enqueueErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Your message has been sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Order inquiry error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
