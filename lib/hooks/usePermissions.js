"use client"
import { useEffect, useState } from "react";
import { createClient } from '@/lib/supabase/client';

export function usePermissions() {
  const [permissions, setPermissions] = useState([]);
  const [profile, setProfile] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchPermissions() {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) return;

        // Check super_admins table
        const { data: superAdmin } = await supabase
          .from("super_admins")
          .select("id, email, role")
          .eq("email", user.email)
          .maybeSingle();

        if (superAdmin && active) {
          setIsSuperAdmin(true);
        }

        const { data: userProfile, error: profileError } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!userProfile) return;

        if (active) setProfile(userProfile);

        const [tenantResult, permissionsResult] = await Promise.all([
          userProfile.tenant_id
            ? supabase
                .from("tenants")
                .select("*")
                .eq("id", userProfile.tenant_id)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          supabase
            .from("role_permissions")
            .select("page_name, can_access")
            .eq("role_name", userProfile.role),
        ]);

        if (tenantResult.error) throw tenantResult.error;
        if (permissionsResult.error) throw permissionsResult.error;

        if (active) {
          setTenant(tenantResult.data);
          setPermissions(permissionsResult.data || []);
        }
      } catch (error) {
        console.error("Error fetching permissions:", error);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchPermissions();

    return () => {
      active = false;
    };
  }, []);

  const canAccess = (page) => {
    if (isSuperAdmin || profile?.role === "owner" || profile?.role === "admin" || profile?.role === "super_admin") return true;
    return permissions.some(
      (permission) => permission.page_name === page && permission.can_access
    );
  };

  return { permissions, profile, tenant, loading, canAccess, isSuperAdmin };
}