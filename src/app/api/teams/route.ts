import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase(req: NextRequest) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}
  );
}

// GET /api/teams — get user's team (and members)
export async function GET(req: NextRequest) {
  const sb = getSupabase(req);
  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Find teams this user belongs to
  const { data: memberships } = await sb
    .from("team_members")
    .select("team_id, role")
    .eq("user_id", user.id);

  if (!memberships?.length) return NextResponse.json({ team: null });

  const teamId = memberships[0].team_id;
  const { data: team } = await sb.from("teams").select("*").eq("id", teamId).single();

  const { data: members } = await sb
    .from("team_members")
    .select("id, user_id, role, joined_at")
    .eq("team_id", teamId);

  return NextResponse.json({ team, members: members || [], role: memberships[0].role });
}

// POST /api/teams — create team or join by invite code
export async function POST(req: NextRequest) {
  const sb = getSupabase(req);
  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { action, name, inviteCode } = await req.json();

  if (action === "create") {
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const { data: team, error: teamErr } = await sb
      .from("teams")
      .insert({ name, owner_id: user.id })
      .select()
      .single();

    if (teamErr) return NextResponse.json({ error: teamErr.message }, { status: 500 });

    await sb.from("team_members").insert({
      team_id: team.id,
      user_id: user.id,
      role: "owner",
    });

    return NextResponse.json({ team, role: "owner" });
  }

  if (action === "join") {
    if (!inviteCode) return NextResponse.json({ error: "inviteCode is required" }, { status: 400 });

    const { data: team } = await sb
      .from("teams")
      .select("*")
      .eq("invite_code", inviteCode)
      .single();

    if (!team) return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });

    const { error: joinErr } = await sb
      .from("team_members")
      .upsert({ team_id: team.id, user_id: user.id, role: "editor" }, { onConflict: "team_id,user_id" });

    if (joinErr) return NextResponse.json({ error: joinErr.message }, { status: 500 });
    return NextResponse.json({ team, role: "editor" });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}

// DELETE /api/teams — leave or delete team
export async function DELETE(req: NextRequest) {
  const sb = getSupabase(req);
  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");
  if (!teamId) return NextResponse.json({ error: "teamId is required" }, { status: 400 });

  const { data: membership } = await sb
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();

  if (membership?.role === "owner") {
    // Owner deletes the whole team
    await sb.from("team_members").delete().eq("team_id", teamId);
    await sb.from("teams").delete().eq("id", teamId);
  } else {
    // Member leaves
    await sb.from("team_members").delete().eq("team_id", teamId).eq("user_id", user.id);
  }

  return NextResponse.json({ success: true });
}
