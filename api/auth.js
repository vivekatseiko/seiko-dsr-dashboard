// api/auth.js (Vercel Function)
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { action, email, password, storeCode } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  try {
    if (action === "login") {
      // Verify user
      const { data: user, error } = await supabase
        .from("auth_users")
        .select("*")
        .eq("email", email)
        .single();

      if (error || !user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (!user.is_active) {
        return res.status(401).json({ error: "User account is inactive" });
      }

      // Return session (simplified - use JWT in production)
      return res.status(200).json({
        success: true,
        email: user.email,
        storeCode: user.store_code,
        sessionToken: Buffer.from(`${email}:${Date.now()}`).toString("base64"),
      });
    } else if (action === "register") {
      // Register new user (admin only - should be restricted)
      if (!storeCode) {
        return res.status(400).json({ error: "Store code required for registration" });
      }

      // Check if store exists
      const { data: store } = await supabase
        .from("store_master")
        .select("*")
        .eq("store_code", storeCode)
        .single();

      if (!store) {
        return res.status(400).json({ error: "Invalid store code" });
      }

      // Check if user already exists
      const { data: existing } = await supabase
        .from("auth_users")
        .select("*")
        .eq("email", email)
        .single();

      if (existing) {
        return res.status(400).json({ error: "User already exists" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const { data: newUser, error: createError } = await supabase
        .from("auth_users")
        .insert({
          email,
          password_hash: passwordHash,
          store_code: storeCode,
          is_active: true,
        })
        .select()
        .single();

      if (createError) {
        return res.status(500).json({ error: "Failed to create user" });
      }

      return res.status(200).json({
        success: true,
        message: "User registered successfully",
        email: newUser.email,
      });
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (error) {
    console.error("Auth error:", error);
    res.status(500).json({ error: error.message });
  }
}
