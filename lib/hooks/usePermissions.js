"use client"
// lib/hooks/usePermissions.js
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function usePermissions() {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const supabase = createClient();
        // ... your code
      } catch (error) {
        console.error('Error fetching permissions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, []);

  return { permissions, loading };
}