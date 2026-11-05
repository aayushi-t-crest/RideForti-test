import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendDirectSms } from "../_shared/twilio.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user with their token
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role using service role client
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleRows } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "ambassador"]);
    const roles = (roleRows || []).map((r: any) => r.role);
    const isAdmin = roles.includes("admin");
    const isAmbassador = roles.includes("ambassador");

    const { data: dirRow } = await adminClient
      .from("admin_users_directory")
      .select("is_supervisor")
      .eq("user_id", user.id)
      .maybeSingle();
    const isSupervisor = !!dirRow?.is_supervisor;

    const SUPERVISOR_ALLOWED = new Set([
      "get_supervisors",
      "assign_ticket",
      "assign_faq_question",
      "get_my_assigned_tickets",
      "get_support_tickets",
      "get_ticket_chat",
      "staff_reply",
      "toggle_ai",
      "update_ticket_status",
    ]);

    const AMBASSADOR_ALLOWED = new Set([
      "get_download_tracker",
      "change_password",
    ]);

    // Actions any authenticated user may call (personal inbox, etc.)
    const ANY_USER_ALLOWED = new Set([
      "get_my_tasks",
      "get_my_inbox",
      "mark_inbox_seen",
      "mark_inbox_item_read",
      "change_password",
    ]);

    const { action, ...params } = await req.json();

    if (
      !isAdmin
      && !ANY_USER_ALLOWED.has(action)
      && !(isSupervisor && SUPERVISOR_ALLOWED.has(action))
      && !(isAmbassador && AMBASSADOR_ALLOWED.has(action))
    ) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    switch (action) {
      case "get_waitlist": {
        const { data, error } = await adminClient
          .from("waitlist")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_download_tracker": {
        const [{ data: visits, error: visitsError }, { data: drivers, error: driversError }, { data: portal, error: portalError }] = await Promise.all([
          adminClient
            .from("qr_page_visits")
            .select("id, ambassador_id, device_type, platform, created_at, source_page, event_type, store, attribution_source")
            .order("created_at", { ascending: false })
            .limit(10000),
          adminClient
            .from("ambassador_drivers")
            .select("id, first_name, last_name, city, status")
            .eq("status", "active")
            .order("first_name", { ascending: true }),
          adminClient.rpc("get_portal_ambassadors"),
        ]);
        if (visitsError) throw visitsError;
        if (driversError) throw driversError;
        if (portalError) throw portalError;

        const ambassadors: any[] = [];
        const seen = new Set<string>();
        for (const d of drivers || []) {
          if (seen.has(d.id)) continue;
          seen.add(d.id);
          ambassadors.push({
            id: d.id,
            name: `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || "Ambassador",
            city: d.city ?? null,
          });
        }
        for (const p of portal || []) {
          if (seen.has(p.id)) continue;
          seen.add(p.id);
          ambassadors.push({
            id: p.id,
            name: p.name || "Ambassador",
            city: p.city ?? null,
          });
        }
        ambassadors.sort((a, b) => a.name.localeCompare(b.name));

        return new Response(JSON.stringify({ data: { visits: visits || [], ambassadors } }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_support_tickets": {
        const { data, error } = await adminClient
          .from("support_tickets")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_ticket_status": {
        const { ticket_id, status } = params;
        const validStatuses = ["open", "in_progress", "resolved", "closed"];
        if (!validStatuses.includes(status)) {
          return new Response(JSON.stringify({ error: "Invalid status" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error } = await adminClient
          .from("support_tickets")
          .update({ status, updated_at: new Date().toISOString() })
          .eq("id", ticket_id);
        if (error) throw error;

        // Send email notification when ticket is closed
        if (status === "closed") {
          try {
            const { data: ticket } = await adminClient
              .from("support_tickets")
              .select("email, first_name, subject")
              .eq("id", ticket_id)
              .single();
            if (ticket) {
              await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${serviceRoleKey}`,
                },
                body: JSON.stringify({
                  type: "ticket_closed",
                  email: ticket.email,
                  firstName: ticket.first_name,
                  subject: ticket.subject,
                }),
              });
            }
          } catch (notifErr) {
            console.error("Failed to send close notification:", notifErr);
          }
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_users": {
        const { data: { users }, error } = await adminClient.auth.admin.listUsers();
        if (error) throw error;
        const { data: roles } = await adminClient.from("user_roles").select("*");
        const { data: permissions } = await adminClient.from("user_module_permissions").select("*");
        const { data: directory } = await adminClient.from("admin_users_directory").select("user_id, is_supervisor");
        const dirMap = new Map<string, boolean>((directory || []).map((d: any) => [d.user_id, !!d.is_supervisor]));
        const usersWithRoles = users.map((u: any) => ({
          id: u.id,
          email: u.email,
          first_name: u.user_metadata?.first_name || "",
          last_name: u.user_metadata?.last_name || "",
          phone: u.user_metadata?.phone || u.phone || "",
          created_at: u.created_at,
          roles: (roles || []).filter((r: any) => r.user_id === u.id).map((r: any) => r.role),
          must_change_password: u.user_metadata?.must_change_password || false,
          is_supervisor: dirMap.get(u.id) || false,
          module_permissions: (permissions || []).filter((p: any) => p.user_id === u.id).map((p: any) => ({
            module_name: p.module_name,
            access_level: p.access_level,
          })),
        }));
        return new Response(JSON.stringify({ data: usersWithRoles }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "create_user": {
        const { email, password, role, module_permissions, first_name, last_name } = params;
        if (!email) {
          return new Response(JSON.stringify({ error: "Email required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Generate temp password if not provided
        const tempPassword = password || crypto.randomUUID().slice(0, 12) + "A1!";
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { must_change_password: true, first_name: first_name || "", last_name: last_name || "" },
        });
        if (createError) {
          const msg = String(createError.message || "");
          const isDup = /already|registered|exists|duplicate/i.test(msg);
          return new Response(
            JSON.stringify({ error: isDup ? "A user with this email address already exists." : msg }),
            { status: isDup ? 409 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (role && newUser.user) {
          await adminClient.from("user_roles").insert({
            user_id: newUser.user.id,
            role,
          });
        }

        // Add to admin_users_directory so they show up in staff pickers (calendar tagging, etc.)
        if (newUser.user) {
          const fullName = `${first_name || ""} ${last_name || ""}`.trim() || null;
          await adminClient.from("admin_users_directory").upsert({
            user_id: newUser.user.id,
            email,
            full_name: fullName,
            phone: null,
            active: true,
            is_supervisor: false,
          }, { onConflict: "user_id" });
        }

        // Set module permissions
        if (module_permissions && Array.isArray(module_permissions) && newUser.user) {
          const permRows = module_permissions.map((p: any) => ({
            user_id: newUser.user.id,
            module_name: p.module_name,
            access_level: p.access_level || "view",
          }));
          if (permRows.length > 0) {
            await adminClient.from("user_module_permissions").insert(permRows);
          }
        }

        return new Response(JSON.stringify({ data: newUser, temp_password: tempPassword }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      case "update_user": {
        const { user_id, first_name, last_name, email, phone } = params;
        if (!user_id) {
          return new Response(JSON.stringify({ error: "user_id required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const updates: any = {};
        if (first_name !== undefined || last_name !== undefined || phone !== undefined) {
          const { data: existingUser } = await adminClient.auth.admin.getUserById(user_id);
          const existingMeta = existingUser?.user?.user_metadata || {};
          updates.user_metadata = {
            ...existingMeta,
            ...(first_name !== undefined ? { first_name } : {}),
            ...(last_name !== undefined ? { last_name } : {}),
            ...(phone !== undefined ? { phone } : {}),
          };
        }
        if (email) updates.email = email;
        const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(user_id, updates);
        if (updateError) throw updateError;

        // Keep admin_users_directory in sync so staff pickers show fresh data
        try {
          const { data: existingDir } = await adminClient
            .from("admin_users_directory")
            .select("id, full_name, phone")
            .eq("user_id", user_id)
            .maybeSingle();
          const { data: latest } = await adminClient.auth.admin.getUserById(user_id);
          const meta = latest?.user?.user_metadata || {};
          const computedName = `${meta.first_name || ""} ${meta.last_name || ""}`.trim() || null;
          const dirPayload: any = {
            user_id,
            email: latest?.user?.email || email || "",
            full_name: computedName,
            phone: meta.phone || latest?.user?.phone || null,
            active: true,
          };
          if (existingDir) {
            await adminClient.from("admin_users_directory").update({ ...dirPayload, updated_at: new Date().toISOString() }).eq("user_id", user_id);
          } else {
            await adminClient.from("admin_users_directory").insert(dirPayload);
          }
        } catch (e) {
          console.error("admin_users_directory sync failed:", e);
        }

        return new Response(JSON.stringify({ data: updatedUser }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_user": {
        const { user_id } = params;
        if (user_id === user.id) {
          return new Response(JSON.stringify({ error: "Cannot delete yourself" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Archive user before deleting
        const { data: { users: allUsers } } = await adminClient.auth.admin.listUsers();
        const targetUser = allUsers?.find((u: any) => u.id === user_id);
        if (targetUser) {
          const { data: userRoles } = await adminClient.from("user_roles").select("role").eq("user_id", user_id);
          const { data: userPerms } = await adminClient.from("user_module_permissions").select("module_name, access_level").eq("user_id", user_id);
          await adminClient.from("archived_users").insert({
            original_user_id: user_id,
            email: targetUser.email,
            roles: (userRoles || []).map((r: any) => r.role),
            module_permissions: userPerms || [],
            archived_by: user.id,
            created_at: targetUser.created_at,
          });
        }

        const { error } = await adminClient.auth.admin.deleteUser(user_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_archived_users": {
        const { data, error } = await adminClient
          .from("archived_users")
          .select("*")
          .order("archived_at", { ascending: false });
        if (error) throw error;
        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "restore_user": {
        const { archive_id } = params;
        const { data: archived, error: fetchErr } = await adminClient
          .from("archived_users")
          .select("*")
          .eq("id", archive_id)
          .single();
        if (fetchErr || !archived) throw new Error("Archived user not found");

        // Re-create the user with a new temp password
        const tempPassword = crypto.randomUUID().slice(0, 12) + "A1!";
        const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
          email: archived.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { must_change_password: true },
        });
        if (createErr) throw createErr;

        // Restore roles
        if (archived.roles && Array.isArray(archived.roles)) {
          for (const role of archived.roles) {
            await adminClient.from("user_roles").insert({ user_id: newUser.user.id, role });
          }
        }

        // Restore module permissions
        if (archived.module_permissions && Array.isArray(archived.module_permissions)) {
          const permRows = (archived.module_permissions as any[]).map((p: any) => ({
            user_id: newUser.user.id,
            module_name: p.module_name,
            access_level: p.access_level || "view",
          }));
          if (permRows.length > 0) {
            await adminClient.from("user_module_permissions").insert(permRows);
          }
        }

        // Remove from archive
        await adminClient.from("archived_users").delete().eq("id", archive_id);

        return new Response(JSON.stringify({ data: newUser, temp_password: tempPassword }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "permanently_delete_archived": {
        const { archive_id } = params;
        const { error } = await adminClient.from("archived_users").delete().eq("id", archive_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_user_role": {
        const { user_id: targetUserId, role: newRole, remove } = params;
        if (remove) {
          await adminClient.from("user_roles").delete().eq("user_id", targetUserId).eq("role", newRole);
        } else {
          await adminClient.from("user_roles").upsert({ user_id: targetUserId, role: newRole }, { onConflict: "user_id,role" });
        }
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_module_permissions": {
        const { user_id: permUserId, module_permissions: newPerms } = params;
        if (!permUserId || !Array.isArray(newPerms)) {
          return new Response(JSON.stringify({ error: "user_id and module_permissions required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Delete existing permissions for this user
        const { error: delErr } = await adminClient.from("user_module_permissions").delete().eq("user_id", permUserId);
        if (delErr) {
          return new Response(JSON.stringify({ error: `Failed to clear existing permissions: ${delErr.message}` }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Insert new ones
        if (newPerms.length > 0) {
          const rows = newPerms.map((p: any) => ({
            user_id: permUserId,
            module_name: p.module_name,
            access_level: p.access_level || "view",
          }));
          const { error: insErr } = await adminClient.from("user_module_permissions").insert(rows);
          if (insErr) {
            return new Response(JSON.stringify({ error: `Failed to save permissions: ${insErr.message}` }), {
              status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "change_password": {
        // Called by the user themselves to change their temp password
        const { new_password } = params;
        if (!new_password || new_password.length < 6) {
          return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error: pwError } = await adminClient.auth.admin.updateUserById(user.id, {
          password: new_password,
          user_metadata: { must_change_password: false },
        });
        if (pwError) throw pwError;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_my_permissions": {
        const { data: perms, error: permErr } = await adminClient
          .from("user_module_permissions")
          .select("module_name, access_level")
          .eq("user_id", user.id);
        if (permErr) throw permErr;
        return new Response(JSON.stringify({ data: perms, is_primary_admin: isAdmin }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_knowledge": {
        const { data, error } = await adminClient
          .from("knowledge_articles")
          .select("*")
          .order("category")
          .order("updated_at", { ascending: false });
        if (error) throw error;
        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "create_knowledge": {
        const { title, category, content, links, attachments } = params;
        if (!title || !content) {
          return new Response(JSON.stringify({ error: "Title and content required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data, error } = await adminClient
          .from("knowledge_articles")
          .insert({
            title,
            category: category || "general",
            content,
            links: Array.isArray(links) ? links : [],
            attachments: Array.isArray(attachments) ? attachments : [],
          })
          .select()
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_knowledge": {
        const { article_id, title, category, content, is_active, links, attachments } = params;
        const updates: Record<string, any> = {};
        if (title !== undefined) updates.title = title;
        if (category !== undefined) updates.category = category;
        if (content !== undefined) updates.content = content;
        if (is_active !== undefined) updates.is_active = is_active;
        if (links !== undefined) updates.links = Array.isArray(links) ? links : [];
        if (attachments !== undefined) updates.attachments = Array.isArray(attachments) ? attachments : [];
        const { error } = await adminClient
          .from("knowledge_articles")
          .update(updates)
          .eq("id", article_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_knowledge": {
        const { article_id } = params;
        const { error } = await adminClient
          .from("knowledge_articles")
          .delete()
          .eq("id", article_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ---- TASK BOARDS ----
      case "get_boards": {
        const { data, error } = await adminClient
          .from("task_boards")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "create_board": {
        const { name, description } = params;
        if (!name) {
          return new Response(JSON.stringify({ error: "Board name required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data, error } = await adminClient
          .from("task_boards")
          .insert({ name, description, department: params.department || null, created_by: user.id })
          .select()
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_board": {
        const { board_id, name, description } = params;
        const updates: Record<string, any> = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (params.department !== undefined) updates.department = params.department;
        const { error } = await adminClient.from("task_boards").update(updates).eq("id", board_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_board": {
        const { board_id } = params;
        const { error } = await adminClient.from("task_boards").delete().eq("id", board_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ---- TASKS ----
      case "get_tasks": {
        const { board_id } = params;
        const { data, error } = await adminClient
          .from("tasks")
          .select("*, task_attachments(*)")
          .eq("board_id", board_id)
          .order("position");
        if (error) throw error;
        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_my_tasks": {
        // Pull tasks assigned to me from the unified OKR hierarchy.
        // Match by assigned_to_user_id, assigned_to (legacy email), or assignees[] array.
        const { data, error } = await adminClient
          .from("okr_tasks")
          .select("*, okr_key_results!inner(id, title, objective_id, okr_objectives!inner(id, title, department))")
          .or(`assigned_to_user_id.eq.${user.id},assigned_to.eq.${user.email},assignees.cs.{${user.email}}`)
          .neq("status", "done")
          .order("due_date", { ascending: true, nullsFirst: false });
        if (error) throw error;
        const reshaped = (data || []).map((t: any) => ({
          id: t.id,
          board_id: t.okr_key_results?.id || null,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          due_date: t.due_date,
          created_at: t.created_at,
          task_boards: t.okr_key_results
            ? {
                id: t.okr_key_results.id,
                name: `${t.okr_key_results.okr_objectives?.title || "OKR"} → ${t.okr_key_results.title}`,
                department: t.okr_key_results.okr_objectives?.department || null,
              }
            : null,
        }));
        return new Response(JSON.stringify({ data: reshaped }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_my_inbox": {
        // Aggregated inbox: tasks, projects, calendar events/invites, mentions.
        const todayKey = new Date().toISOString().slice(0, 10);
        const horizon = new Date(); horizon.setDate(horizon.getDate() + 30);
        const horizonKey = horizon.toISOString().slice(0, 10);

        const [tasksRes, projectsRes, assignmentsRes, mentionsRes, seenRes] = await Promise.all([
          adminClient
            .from("okr_tasks")
            .select("id, title, status, priority, due_date, created_at, key_result_id, okr_key_results!inner(id, title, okr_objectives!inner(id, title, department))")
            .or(`assigned_to_user_id.eq.${user.id},assigned_to.eq.${user.email},assignees.cs.{${user.email}}`)
            .neq("status", "done")
            .order("created_at", { ascending: false }),
          adminClient
            .from("okr_key_results")
            .select("id, title, status, created_at, objective_id, okr_objectives!inner(id, title, department)")
            .or(`assigned_to.eq.${user.email},assignees.cs.{${user.email}}`)
            .neq("status", "completed")
            .order("created_at", { ascending: false }),
          adminClient
            .from("event_staff_assignments")
            .select("id, event_id, status, role_tag, created_at, department_events!inner(id, title, event_date, event_time, department, location)")
            .eq("user_id", user.id)
            .gte("department_events.event_date", todayKey)
            .lte("department_events.event_date", horizonKey)
            .order("created_at", { ascending: false }),
          adminClient
            .from("event_note_mentions")
            .select("id, note_id, read, created_at, event_notes!inner(id, content, event_id, department_events!inner(id, title, department))")
            .eq("mentioned_user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(50),
          adminClient
            .from("user_inbox_seen")
            .select("last_seen_at, read_keys")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

        const tasks = (tasksRes.data || []).map((t: any) => ({
          item_key: `task:${t.id}`,
          kind: "task",
          id: t.id,
          title: t.title,
          subtitle: t.okr_key_results
            ? `${t.okr_key_results.okr_objectives?.title || "OKR"} → ${t.okr_key_results.title}`
            : null,
          priority: t.priority,
          due_date: t.due_date,
          created_at: t.created_at,
          department: t.okr_key_results?.okr_objectives?.department || null,
          status: t.status,
        }));

        const projects = (projectsRes.data || []).map((p: any) => ({
          item_key: `project:${p.id}`,
          kind: "project",
          id: p.id,
          title: p.title,
          subtitle: p.okr_objectives?.title ? `Objective → ${p.okr_objectives.title}` : null,
          priority: null,
          due_date: null,
          created_at: p.created_at,
          department: p.okr_objectives?.department || null,
          status: p.status,
        }));

        const seenEvents = new Set<string>();
        const events: any[] = [];
        const invites: any[] = [];
        for (const a of (assignmentsRes.data || []) as any[]) {
          const ev = a.department_events;
          if (!ev || seenEvents.has(ev.id)) continue;
          seenEvents.add(ev.id);
          const base = {
            id: a.id,
            event_id: ev.id,
            title: ev.title,
            subtitle: `${a.role_tag}${ev.location ? " • " + ev.location : ""}`,
            due_date: ev.event_date,
            created_at: a.created_at,
            department: ev.department,
            status: a.status,
          };
          if (a.status === "pending") {
            invites.push({ ...base, item_key: `invite:${a.id}`, kind: "invite", priority: "high" });
          } else if (a.status === "accepted") {
            events.push({ ...base, item_key: `event:${a.id}`, kind: "event", priority: "normal" });
          }
        }

        const mentions = (mentionsRes.data || []).map((m: any) => ({
          item_key: `mention:${m.id}`,
          kind: "mention",
          id: m.id,
          title: m.event_notes?.department_events?.title
            ? `Tagged in: ${m.event_notes.department_events.title}`
            : "You were tagged in a note",
          subtitle: (m.event_notes?.content || "").slice(0, 120),
          priority: null,
          due_date: null,
          created_at: m.created_at,
          department: m.event_notes?.department_events?.department || null,
          read: m.read,
        }));

        return new Response(
          JSON.stringify({
            data: {
              tasks,
              projects,
              events,
              invites,
              mentions,
              last_seen_at: seenRes.data?.last_seen_at || null,
              read_keys: seenRes.data?.read_keys || [],
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "mark_inbox_seen": {
        await adminClient
          .from("user_inbox_seen")
          .upsert(
            { user_id: user.id, last_seen_at: new Date().toISOString() },
            { onConflict: "user_id" },
          );
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "mark_inbox_item_read": {
        const { item_key } = params;
        if (!item_key) {
          return new Response(JSON.stringify({ error: "item_key required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: existing } = await adminClient
          .from("user_inbox_seen")
          .select("read_keys")
          .eq("user_id", user.id)
          .maybeSingle();
        const next = Array.from(new Set([...(existing?.read_keys || []), item_key])).slice(-500);
        await adminClient
          .from("user_inbox_seen")
          .upsert(
            { user_id: user.id, read_keys: next },
            { onConflict: "user_id" },
          );
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "create_task": {
        const { board_id, title, description, status, priority, assigned_to, assigned_to_user_id, due_date, department } = params;
        if (!board_id || !title) {
          return new Response(JSON.stringify({ error: "Board ID and title required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Get max position for this status
        const { data: maxPos } = await adminClient
          .from("tasks")
          .select("position")
          .eq("board_id", board_id)
          .eq("status", status || "upcoming")
          .order("position", { ascending: false })
          .limit(1)
          .maybeSingle();
        const newPosition = (maxPos?.position ?? -1) + 1;
        const { data, error } = await adminClient
          .from("tasks")
          .insert({
            board_id,
            title,
            description: description || null,
            status: status || "upcoming",
            priority: priority || "normal",
            position: newPosition,
            created_by: user.id,
            assigned_to: assigned_to || null,
            assigned_to_user_id: assigned_to_user_id || null,
            due_date: due_date || null,
            department: department || null,
          })
          .select("*, task_attachments(*)")
          .single();
        if (error) throw error;

        // Fire assignment notification (non-blocking)
        if (assigned_to) {
          const { data: board } = await adminClient.from("task_boards").select("name").eq("id", board_id).single();
          fetch(`${supabaseUrl}/functions/v1/task-notify`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
            body: JSON.stringify({ type: "assignment", assignee_email: assigned_to, task_title: title, due_date: due_date || null, board_name: board?.name }),
          }).catch(e => console.error("Task notify failed:", e));
        }

        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_task": {
        const { task_id, ...taskUpdates } = params;
        delete taskUpdates.action;

        // Check if assignment changed
        let previousAssignee: string | null = null;
        if (taskUpdates.assigned_to) {
          const { data: existing } = await adminClient.from("tasks").select("assigned_to, board_id, title, due_date").eq("id", task_id).single();
          previousAssignee = existing?.assigned_to || null;

          // If assignee changed, fire notification
          if (existing && taskUpdates.assigned_to !== previousAssignee) {
            const { data: board } = await adminClient.from("task_boards").select("name").eq("id", existing.board_id).single();
            fetch(`${supabaseUrl}/functions/v1/task-notify`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
              body: JSON.stringify({
                type: "assignment",
                assignee_email: taskUpdates.assigned_to,
                task_title: taskUpdates.title || existing.title,
                due_date: taskUpdates.due_date || existing.due_date,
                board_name: board?.name,
              }),
            }).catch(e => console.error("Task notify failed:", e));
          }
        }

        const { error } = await adminClient.from("tasks").update(taskUpdates).eq("id", task_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_task": {
        const { task_id } = params;
        const { error } = await adminClient.from("tasks").delete().eq("id", task_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ---- ATTACHMENTS ----
      case "add_attachment": {
        const { task_id, name, type, url } = params;
        if (!task_id || !name || !url) {
          return new Response(JSON.stringify({ error: "Task ID, name, and URL required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data, error } = await adminClient
          .from("task_attachments")
          .insert({ task_id, name, type: type || "link", url })
          .select()
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_attachment": {
        const { attachment_id } = params;
        const { error } = await adminClient.from("task_attachments").delete().eq("id", attachment_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_upload_url": {
        const { file_name } = params;
        const filePath = `${crypto.randomUUID()}/${file_name}`;
        const { data, error } = await adminClient.storage
          .from("task-attachments")
          .createSignedUploadUrl(filePath);
        if (error) throw error;
        // Also get a signed read URL
        const { data: readData } = await adminClient.storage
          .from("task-attachments")
          .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year
        return new Response(JSON.stringify({ 
          uploadUrl: data.signedUrl,
          token: data.token,
          path: filePath,
          readUrl: readData?.signedUrl,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "send_credentials": {
        const { user_id: credUserId, email: credEmail, temp_password, login_url } = params;
        if (!credEmail || !temp_password) {
          return new Response(JSON.stringify({ error: "Email and temp_password required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const results: Record<string, any> = { email: { sent: false }, sms: { sent: false } };

        // --- EMAIL via Resend (direct API, rideforti.com domain) ---
        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (resendKey) {
          try {
            const emailRes = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${resendKey}`,
              },
              body: JSON.stringify({
                from: "Forti Admin <admin@rideforti.com>",
                to: [credEmail],
                subject: "Your Forti Admin Login Credentials",
                html: `
                  <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;">
                    <h2 style="color:#000;">Welcome to Forti Admin</h2>
                    <p>Your admin account has been created. Use the credentials below to log in:</p>
                    <div style="background:#f4f4f5;padding:16px;border-radius:8px;margin:16px 0;">
                      <p style="margin:4px 0;"><strong>Login URL:</strong> <a href="${login_url}">${login_url}</a></p>
                      <p style="margin:4px 0;"><strong>Email:</strong> ${credEmail}</p>
                      <p style="margin:4px 0;"><strong>Temporary Password:</strong> ${temp_password}</p>
                    </div>
                    <p style="color:#666;font-size:14px;">You'll be asked to set a new password on your first login.</p>
                  </div>
                `,
              }),
            });
            const emailJson = await emailRes.json();
            results.email = { sent: emailRes.ok, id: emailJson.id, error: emailRes.ok ? undefined : emailJson };
          } catch (e) {
            results.email = { sent: false, error: (e as Error).message };
          }
        } else {
          results.email = { sent: false, reason: "RESEND_API_KEY not configured" };
        }

        // --- SMS via direct Twilio helper ---
        const twilioTo = params.phone;
        if (twilioTo) {
          const smsBody = `Forti Admin Login\nURL: ${login_url}\nEmail: ${credEmail}\nTemp Password: ${temp_password}\nYou'll set a new password on first login.`;
          const smsRes = await sendDirectSms({ to: twilioTo, body: smsBody });
          results.sms = { sent: smsRes.success, sid: smsRes.sid, error: smsRes.error };
        } else {
          results.sms = { sent: false, reason: "No phone number provided" };
        }

        return new Response(JSON.stringify({ success: true, results }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "resend_credentials": {
        const { user_id: rcUserId, channels: rcChannels, login_url: rcLoginUrl } = params;
        if (!rcUserId) {
          return new Response(JSON.stringify({ error: "user_id required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const channels: string[] = Array.isArray(rcChannels) && rcChannels.length > 0 ? rcChannels : ["email"];

        // Look up user
        const { data: targetData, error: targetErr } = await adminClient.auth.admin.getUserById(rcUserId);
        if (targetErr || !targetData?.user) {
          return new Response(JSON.stringify({ error: "User not found" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const targetEmail = targetData.user.email!;
        const targetPhone =
          (targetData.user.user_metadata?.phone as string | undefined) ||
          targetData.user.phone || "";

        // Generate new temp password and require change on next login
        const newTempPassword = crypto.randomUUID().slice(0, 12) + "A1!";
        const existingMeta = targetData.user.user_metadata || {};
        const { error: updErr } = await adminClient.auth.admin.updateUserById(rcUserId, {
          password: newTempPassword,
          user_metadata: { ...existingMeta, must_change_password: true },
        });
        if (updErr) {
          return new Response(JSON.stringify({ error: updErr.message }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const loginUrl = rcLoginUrl || "https://www.rideforti.com/admin/login";
        const results: Record<string, any> = {};

        // EMAIL
        if (channels.includes("email")) {
          const resendKey = Deno.env.get("RESEND_API_KEY");
          if (!resendKey) {
            results.email = { sent: false, reason: "RESEND_API_KEY not configured" };
          } else {
            try {
              const emailRes = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${resendKey}` },
                body: JSON.stringify({
                  from: "Forti Admin <admin@rideforti.com>",
                  to: [targetEmail],
                  subject: "Your Forti Admin Login Credentials",
                  html: `
                    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;">
                      <h2 style="color:#000;">Forti Admin Credentials</h2>
                      <p>Your admin password has been reset. Use the credentials below to log in:</p>
                      <div style="background:#f4f4f5;padding:16px;border-radius:8px;margin:16px 0;">
                        <p style="margin:4px 0;"><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
                        <p style="margin:4px 0;"><strong>Email:</strong> ${targetEmail}</p>
                        <p style="margin:4px 0;"><strong>Temporary Password:</strong> ${newTempPassword}</p>
                      </div>
                      <p style="color:#666;font-size:14px;">You'll be asked to set a new password on your next login.</p>
                    </div>
                  `,
                }),
              });
              const emailJson = await emailRes.json();
              results.email = { sent: emailRes.ok, id: emailJson.id, error: emailRes.ok ? undefined : emailJson };
            } catch (e) {
              results.email = { sent: false, error: (e as Error).message };
            }
          }
        }

        // SMS
        if (channels.includes("sms")) {
          if (!targetPhone) {
            results.sms = { sent: false, reason: "No phone number on file" };
          } else {
            const smsBody = `Forti Admin Login\nURL: ${loginUrl}\nEmail: ${targetEmail}\nTemp Password: ${newTempPassword}\nYou'll set a new password on next login.`;
            const smsRes = await sendDirectSms({ to: targetPhone, body: smsBody });
            results.sms = { sent: smsRes.success, sid: smsRes.sid, error: smsRes.error };
          }
        }

        return new Response(JSON.stringify({ success: true, results }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "staff_reply": {
        const { ticket_id, session_id, content: replyContent, staff_name, attachments: rawAttachments } = params;
        const hasContent = typeof replyContent === "string" && replyContent.trim().length > 0;
        const hasAttachments = Array.isArray(rawAttachments) && rawAttachments.length > 0;
        if (!hasContent && !hasAttachments) {
          return new Response(JSON.stringify({ error: "Content or attachment required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const attachments = (Array.isArray(rawAttachments) ? rawAttachments : [])
          .filter((a: any) => a && typeof a.url === "string" && /^https?:\/\//i.test(a.url))
          .slice(0, 10)
          .map((a: any) => ({
            type: ["image", "file", "link"].includes(a.type) ? a.type : "file",
            name: String(a.name || "attachment").slice(0, 200),
            url: String(a.url).slice(0, 2000),
          }));

        // Find the session for this ticket if not provided
        let targetSessionId = session_id;
        if (!targetSessionId && ticket_id) {
          // Find the ticket to get the email, then find open session
          const { data: ticket } = await adminClient
            .from("support_tickets")
            .select("email")
            .eq("id", ticket_id)
            .single();
          if (ticket) {
            const { data: contact } = await adminClient
              .from("support_contacts")
              .select("id")
              .eq("email", ticket.email)
              .maybeSingle();
            if (contact) {
              const { data: session } = await adminClient
                .from("support_chat_sessions")
                .select("id")
                .eq("contact_id", contact.id)
                .eq("status", "open")
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              if (session) targetSessionId = session.id;
            }
          }
        }

        if (!targetSessionId) {
          return new Response(JSON.stringify({ error: "No active session found for this ticket" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Insert staff message
        const { error: msgError } = await adminClient
          .from("support_chat_messages")
          .insert({
            session_id: targetSessionId,
            role: "staff",
            content: hasContent ? replyContent.trim().slice(0, 5000) : "",
            staff_name: staff_name || "Support Agent",
            attachments,
          });
        if (msgError) throw msgError;

        // Promote ticket from "open" to "in_progress" on first staff response
        if (ticket_id) {
          await adminClient
            .from("support_tickets")
            .update({ status: "in_progress", updated_at: new Date().toISOString() })
            .eq("id", ticket_id)
            .eq("status", "open");
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_ticket_chat": {
        const { email: ticketEmail } = params;
        if (!ticketEmail) {
          return new Response(JSON.stringify({ error: "Email required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Find contact by email
        const { data: chatContact } = await adminClient
          .from("support_contacts")
          .select("id")
          .eq("email", ticketEmail.toLowerCase().trim())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!chatContact) {
          return new Response(JSON.stringify({ session: null, messages: [] }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get most recent session
        const { data: chatSession } = await adminClient
          .from("support_chat_sessions")
          .select("*")
          .eq("contact_id", chatContact.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!chatSession) {
          return new Response(JSON.stringify({ session: null, messages: [] }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: chatMessages } = await adminClient
          .from("support_chat_messages")
          .select("*")
          .eq("session_id", chatSession.id)
          .order("created_at", { ascending: true });

        return new Response(JSON.stringify({ session: chatSession, messages: chatMessages || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "toggle_ai": {
        const { session_id: aiSessionId, enabled: aiEnabled } = params;
        if (!aiSessionId) {
          return new Response(JSON.stringify({ error: "session_id required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error: aiError } = await adminClient
          .from("support_chat_sessions")
          .update({ ai_enabled: !!aiEnabled })
          .eq("id", aiSessionId);
        if (aiError) throw aiError;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ---- SUPERVISORS & ASSIGNMENT ----
      case "get_supervisors": {
        const { data: dir } = await adminClient
          .from("admin_users_directory")
          .select("user_id, email, full_name, phone, is_supervisor, active")
          .eq("is_supervisor", true)
          .eq("active", true);
        const { data: { users: allUsers } } = await adminClient.auth.admin.listUsers();
        const adminRoles = await adminClient.from("user_roles").select("user_id").eq("role", "admin");
        const adminIds = new Set((adminRoles.data || []).map((r: any) => r.user_id));
        const supervisors = (dir || []).map((d: any) => {
          const u = (allUsers || []).find((x: any) => x.id === d.user_id);
          return {
            user_id: d.user_id,
            email: d.email || u?.email || "",
            full_name: d.full_name || `${u?.user_metadata?.first_name || ""} ${u?.user_metadata?.last_name || ""}`.trim(),
            phone: d.phone || u?.user_metadata?.phone || u?.phone || "",
          };
        });
        const admins = (allUsers || [])
          .filter((u: any) => adminIds.has(u.id))
          .map((u: any) => ({
            user_id: u.id,
            email: u.email,
            full_name: `${u.user_metadata?.first_name || ""} ${u.user_metadata?.last_name || ""}`.trim(),
            phone: u.user_metadata?.phone || u.phone || "",
          }));
        return new Response(JSON.stringify({ supervisors, admins }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "set_supervisor": {
        const { user_id: targetId, is_supervisor: flag } = params;
        if (!targetId) {
          return new Response(JSON.stringify({ error: "user_id required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: existing } = await adminClient
          .from("admin_users_directory")
          .select("id")
          .eq("user_id", targetId)
          .maybeSingle();
        if (existing) {
          await adminClient
            .from("admin_users_directory")
            .update({ is_supervisor: !!flag, updated_at: new Date().toISOString() })
            .eq("user_id", targetId);
        } else {
          const { data: { user: u } } = await adminClient.auth.admin.getUserById(targetId);
          await adminClient.from("admin_users_directory").insert({
            user_id: targetId,
            email: u?.email || "",
            full_name: `${u?.user_metadata?.first_name || ""} ${u?.user_metadata?.last_name || ""}`.trim() || null,
            phone: u?.user_metadata?.phone || u?.phone || null,
            is_supervisor: !!flag,
          });
        }
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "assign_ticket": {
        const { ticket_id, assignee_user_id, level } = params;
        if (!ticket_id || !assignee_user_id || !level) {
          return new Response(JSON.stringify({ error: "ticket_id, assignee_user_id, level required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!["supervisor", "admin"].includes(level)) {
          return new Response(JSON.stringify({ error: "Invalid level" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!isAdmin && level !== "admin") {
          return new Response(JSON.stringify({ error: "Supervisors can only reassign to admin" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: { user: assignee } } = await adminClient.auth.admin.getUserById(assignee_user_id);
        if (!assignee) {
          return new Response(JSON.stringify({ error: "Assignee not found" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const assigneeName = `${assignee.user_metadata?.first_name || ""} ${assignee.user_metadata?.last_name || ""}`.trim() || assignee.email;
        const assigneePhone = assignee.user_metadata?.phone || assignee.phone || null;

        const { data: ticket } = await adminClient
          .from("support_tickets")
          .select("id, subject, first_name, last_name")
          .eq("id", ticket_id)
          .maybeSingle();
        if (!ticket) {
          return new Response(JSON.stringify({ error: "Ticket not found" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error: updErr } = await adminClient
          .from("support_tickets")
          .update({
            assigned_to_user_id: assignee_user_id,
            assigned_to_email: assignee.email,
            assigned_to_name: assigneeName,
            assignment_level: level,
            assigned_at: new Date().toISOString(),
            assigned_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ticket_id);
        if (updErr) throw updErr;

        const ticketShort = ticket.id.slice(0, 8).toUpperCase();
        const subjectLine = level === "admin" ? "Ticket escalated to you" : "Ticket assigned to you";
        const body = `Ticket #${ticketShort} — "${ticket.subject || "Support ticket"}" from ${ticket.first_name || ""} ${ticket.last_name || ""} has been ${level === "admin" ? "escalated" : "assigned"} to you. Please review in the admin dashboard.`;

        try {
          await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
            body: JSON.stringify({
              type: "ticket_assignment",
              email: assignee.email,
              firstName: assignee.user_metadata?.first_name || "",
              subject: subjectLine,
              messageBody: body,
            }),
          });
        } catch (e) { console.error("assign email failed", e); }

        if (assigneePhone) {
          try {
            await sendDirectSms({ to: assigneePhone, body });
          } catch (e) { console.error("assign sms failed", e); }
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "assign_faq_question": {
        const { question_id, assignee_user_id, level } = params;
        if (!question_id || !assignee_user_id || !level) {
          return new Response(JSON.stringify({ error: "question_id, assignee_user_id, level required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!isAdmin && level !== "admin") {
          return new Response(JSON.stringify({ error: "Supervisors can only reassign to admin" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: { user: assignee } } = await adminClient.auth.admin.getUserById(assignee_user_id);
        if (!assignee) {
          return new Response(JSON.stringify({ error: "Assignee not found" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const assigneeName = `${assignee.user_metadata?.first_name || ""} ${assignee.user_metadata?.last_name || ""}`.trim() || assignee.email;
        const assigneePhone = assignee.user_metadata?.phone || assignee.phone || null;

        const { data: q } = await adminClient
          .from("support_faq_questions")
          .select("id, question, ticket_number, assigned_to")
          .eq("id", question_id)
          .maybeSingle();
        if (!q) {
          return new Response(JSON.stringify({ error: "Question not found" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const previousAssignee = q.assigned_to || null;
        await adminClient
          .from("support_faq_questions")
          .update({
            assigned_to: assignee.email,
            assigned_to_email: assignee.email,
            assigned_to_name: assigneeName,
            escalation_level: level,
            reassigned_from: previousAssignee,
            updated_at: new Date().toISOString(),
          })
          .eq("id", question_id);

        const subjectLine = level === "admin" ? "FAQ question escalated to you" : "FAQ question assigned to you";
        const body = `FAQ question${q.ticket_number ? ` (ticket #${q.ticket_number})` : ""}: "${(q.question || "").slice(0, 120)}" — ${level === "admin" ? "escalated" : "assigned"} to you.`;

        try {
          await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
            body: JSON.stringify({
              type: "faq_assignment",
              email: assignee.email,
              firstName: assignee.user_metadata?.first_name || "",
              subject: subjectLine,
              messageBody: body,
            }),
          });
        } catch (e) { console.error("faq assign email failed", e); }

        if (assigneePhone) {
          try {
            await sendDirectSms({ to: assigneePhone, body });
          } catch (e) { console.error("faq assign sms failed", e); }
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ---- OKR OBJECTIVES ----
      case "get_okr_objectives": {
        const { department } = params;
        let query = adminClient.from("okr_objectives").select("*").order("created_at", { ascending: false });
        if (department) query = query.eq("department", department);
        const { data, error } = await query;
        if (error) throw error;
        return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "create_okr_objective": {
        const { title, description, department, time_period } = params;
        if (!title) return new Response(JSON.stringify({ error: "Title required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const { data, error } = await adminClient.from("okr_objectives").insert({ title, description, department: department || "sales", time_period: time_period || "Q2 2026", created_by: user.id }).select().single();
        if (error) throw error;
        return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "update_okr_objective": {
        const { objective_id, ...updates } = params;
        const { error } = await adminClient.from("okr_objectives").update(updates).eq("id", objective_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "delete_okr_objective": {
        const { objective_id } = params;
        const { error } = await adminClient.from("okr_objectives").delete().eq("id", objective_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ---- OKR KEY RESULTS ----
      case "get_okr_key_results": {
        const { objective_id } = params;
        const { data, error } = await adminClient.from("okr_key_results").select("*").eq("objective_id", objective_id).order("created_at");
        if (error) throw error;
        return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "create_okr_key_result": {
        const { objective_id, title, description, target_value, unit, assigned_to, assignees } = params;
        if (!objective_id || !title) return new Response(JSON.stringify({ error: "objective_id and title required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const assigneeList: string[] = Array.isArray(assignees) ? assignees.filter(Boolean) : (assigned_to ? [assigned_to] : []);
        const primary = assigneeList[0] || null;
        const { data, error } = await adminClient.from("okr_key_results").insert({
          objective_id, title, description,
          target_value: target_value || 100, unit: unit || "%",
          assigned_to: primary, assignees: assigneeList,
        }).select().single();
        if (error) throw error;

        // Notify each assignee (non-blocking)
        if (assigneeList.length > 0) {
          const { data: obj } = await adminClient.from("okr_objectives").select("title, department").eq("id", objective_id).single();
          const dept = obj?.department || "ops";
          const deepLink = `https://rideforti.com/admin?dept=${dept}&module=okr&project=${data.id}`;
          for (const email of assigneeList) {
            fetch(`${supabaseUrl}/functions/v1/task-notify`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
              body: JSON.stringify({ type: "assignment", assignee_email: email, task_title: title, due_date: null, board_name: obj?.title || undefined, kind: "project", module_name: "OKR Tracker", department: dept, deep_link: deepLink }),
            }).catch(e => console.error("OKR project notify failed:", e));
          }
        }

        return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "update_okr_key_result": {
        const { key_result_id, ...krUpdates } = params;
        // Normalize assignees + keep assigned_to in sync
        let newlyAdded: string[] = [];
        if (Array.isArray(krUpdates.assignees)) {
          krUpdates.assignees = krUpdates.assignees.filter(Boolean);
          krUpdates.assigned_to = krUpdates.assignees[0] || null;
          const { data: existing } = await adminClient.from("okr_key_results").select("assignees, title, objective_id").eq("id", key_result_id).single();
          const prev: string[] = existing?.assignees || [];
          newlyAdded = krUpdates.assignees.filter((e: string) => !prev.includes(e));
          if (newlyAdded.length > 0 && existing) {
            const { data: obj } = await adminClient.from("okr_objectives").select("title, department").eq("id", existing.objective_id).single();
            const dept = obj?.department || "ops";
            const deepLink = `https://rideforti.com/admin?dept=${dept}&module=okr&project=${key_result_id}`;
            for (const email of newlyAdded) {
              fetch(`${supabaseUrl}/functions/v1/task-notify`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
                body: JSON.stringify({ type: "assignment", assignee_email: email, task_title: existing.title, due_date: null, board_name: obj?.title || undefined, kind: "project", module_name: "OKR Tracker", department: dept, deep_link: deepLink }),
              }).catch(e => console.error("OKR project notify failed:", e));
            }
          }
        }
        const { error } = await adminClient.from("okr_key_results").update(krUpdates).eq("id", key_result_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "delete_okr_key_result": {
        const { key_result_id } = params;
        const { error } = await adminClient.from("okr_key_results").delete().eq("id", key_result_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ---- OKR TASKS ----
      case "get_okr_tasks": {
        const { key_result_id } = params;
        const { data, error } = await adminClient.from("okr_tasks").select("*").eq("key_result_id", key_result_id).order("created_at");
        if (error) throw error;
        return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "create_okr_task": {
        const {
          key_result_id, title, description, priority, assigned_to, assignees,
          due_date, reminder_at, reminder_frequency,
          notify_email, notify_sms,
          notes, links, attachments,
        } = params;
        if (!key_result_id || !title) return new Response(JSON.stringify({ error: "key_result_id and title required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const finalAssignees: string[] = Array.isArray(assignees) && assignees.length
          ? assignees
          : (assigned_to ? [assigned_to] : []);
        const validFreq = ["daily", "weekly", "monthly"].includes(reminder_frequency) ? reminder_frequency : null;
        const { data, error } = await adminClient.from("okr_tasks").insert({
          key_result_id, title, description,
          priority: priority || "normal",
          assigned_to: finalAssignees[0] ?? null,
          assignees: finalAssignees,
          due_date,
          reminder_at,
          reminder_frequency: validFreq,
          notify_email: notify_email !== false,
          notify_sms: notify_sms || false,
          notes: notes ?? null,
          links: Array.isArray(links) ? links : [],
          attachments: Array.isArray(attachments) ? attachments : [],
        }).select().single();
        if (error) throw error;

        // Notify all assignees on create (non-blocking) — backend-side guarantees delivery
        if (finalAssignees.length > 0) {
          const { data: kr } = await adminClient
            .from("okr_key_results")
            .select("title, okr_objectives:objective_id(department)")
            .eq("id", key_result_id)
            .single();
          const dept = (kr as any)?.okr_objectives?.department || "ops";
          const deepLink = `https://rideforti.com/admin?dept=${dept}&module=okr&task=${data.id}`;
          for (const email of finalAssignees) {
            fetch(`${supabaseUrl}/functions/v1/task-notify`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
              body: JSON.stringify({
                type: "assignment",
                assignee_email: email,
                task_title: title,
                due_date: due_date || null,
                board_name: kr?.title || undefined,
                kind: "task",
                module_name: "OKR Tracker",
                department: dept,
                deep_link: deepLink,
              }),
            }).catch(e => console.error("OKR task create notify failed:", e));
          }
        }
        return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "update_okr_task": {
        const { task_id: okrTaskId, assignees: updAssignees, reminder_frequency: updFreq, ...taskUpdates } = params;
        let newlyAddedTaskAssignees: string[] = [];
        let existingTask: any = null;
        if (Array.isArray(updAssignees)) {
          taskUpdates.assignees = updAssignees;
          taskUpdates.assigned_to = updAssignees[0] ?? null;
          const { data: existing } = await adminClient.from("okr_tasks").select("assignees, title, key_result_id, due_date").eq("id", okrTaskId).single();
          existingTask = existing;
          const prev: string[] = existing?.assignees || [];
          newlyAddedTaskAssignees = updAssignees.filter((e: string) => e && !prev.includes(e));
        }
        if (typeof updFreq !== "undefined") {
          taskUpdates.reminder_frequency = ["daily", "weekly", "monthly"].includes(updFreq) ? updFreq : null;
        }
        const { error } = await adminClient.from("okr_tasks").update(taskUpdates).eq("id", okrTaskId);
        if (error) throw error;

        // Notify newly added assignees on edit (non-blocking)
        if (newlyAddedTaskAssignees.length > 0 && existingTask) {
          const { data: kr } = await adminClient
            .from("okr_key_results")
            .select("title, okr_objectives:objective_id(department)")
            .eq("id", existingTask.key_result_id)
            .single();
          const dept = (kr as any)?.okr_objectives?.department || "ops";
          const deepLink = `https://rideforti.com/admin?dept=${dept}&module=okr&task=${okrTaskId}`;
          for (const email of newlyAddedTaskAssignees) {
            fetch(`${supabaseUrl}/functions/v1/task-notify`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
              body: JSON.stringify({
                type: "assignment",
                assignee_email: email,
                task_title: taskUpdates.title || existingTask.title,
                due_date: taskUpdates.due_date || existingTask.due_date,
                board_name: kr?.title || undefined,
                kind: "task",
                module_name: "OKR Tracker",
                department: dept,
                deep_link: deepLink,
              }),
            }).catch(e => console.error("OKR task notify failed:", e));
          }
        }
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "delete_okr_task": {
        const { task_id: okrDelTaskId } = params;
        const { error } = await adminClient.from("okr_tasks").delete().eq("id", okrDelTaskId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
