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
    const { firstName, lastName, email, phone, date, time } = await req.json();

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
      console.log("No staff users found to notify");
      return new Response(
        JSON.stringify({ success: true, message: "No staff to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get staff emails from profiles
    const staffUserIds = staffRoles.map((r) => r.user_id);
    const { data: staffProfiles } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .in("user_id", staffUserIds);

    const staffEmails = staffProfiles?.map((p) => p.email).filter(Boolean) || [];

    if (staffEmails.length === 0) {
      console.log("No staff emails found");
      return new Response(
        JSON.stringify({ success: true, message: "No staff emails found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enqueue notification email for each staff member
    for (const staffEmail of staffEmails) {
      const { error: enqueueErr } = await supabaseAdmin.rpc("enqueue_email", {
        p_to: staffEmail,
        p_subject: `New Consultation Booking – ${firstName} ${lastName}`,
        p_html: `
          <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="color: #1a2a3a; font-size: 22px; margin-bottom: 24px;">New Consultation Booked</h1>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px; width: 120px;">Client</td>
                <td style="padding: 8px 0; color: #1a2a3a; font-size: 14px;">${firstName} ${lastName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Email</td>
                <td style="padding: 8px 0; color: #1a2a3a; font-size: 14px;"><a href="mailto:${email}" style="color: #8b7355;">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Phone</td>
                <td style="padding: 8px 0; color: #1a2a3a; font-size: 14px;">${phone || "Not provided"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 14px;">Date & Time</td>
                <td style="padding: 8px 0; color: #1a2a3a; font-size: 14px;">${date} at ${time}</td>
              </tr>
            </table>
            <p style="color: #666; font-size: 13px; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
              This is an automated notification from H.R. Lawrence Fine Jewelry.
            </p>
          </div>
        `,
      });

      if (enqueueErr) {
        console.error(`Failed to enqueue email for ${staffEmail}:`, enqueueErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: `Notified ${staffEmails.length} staff member(s)` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Notification error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
