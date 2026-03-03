import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, orderNumber, portalUrl } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if user already exists and has confirmed their email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser && existingUser.email_confirmed_at) {
      // User exists and confirmed — send a magic link email so they can log in
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

      const magicRes = await fetch(`${supabaseUrl}/auth/v1/magiclink`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": anonKey,
        },
        body: JSON.stringify({
          email,
          options: {
            emailRedirectTo: `${portalUrl}/my-orders`,
          },
        }),
      });

      if (!magicRes.ok) {
        const errBody = await magicRes.text();
        console.error("Magic link error:", errBody);
        return new Response(
          JSON.stringify({ error: "Failed to send login link" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Login link sent to existing user", alreadyExists: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If user exists but hasn't confirmed, delete and re-invite for a fresh token
    if (existingUser && !existingUser.email_confirmed_at) {
      await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
    }

    // Send invitation email via Supabase Auth
    const signupUrl = `${portalUrl}/auth`;
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: signupUrl,
      data: {
        invited_for_order: orderNumber,
      },
    });

    if (error) {
      console.error("Invite error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to send invitation", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Invitation email sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
