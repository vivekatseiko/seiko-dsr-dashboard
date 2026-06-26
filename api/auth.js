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

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  try {
    // Fetch user from database
    const { data: user, error: fetchError } = await supabase
      .from("auth_users")
      .select("id, email, password_hash, store_code, role, is_active")
      .eq("email", email.toLowerCase())
      .single();

    if (fetchError || !user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.is_active) {
      return res.status(401).json({ error: "Account is inactive" });
    }

    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Return success with role
    return res.status(200).json({
      token: `token_${user.id}_${Date.now()}`,
      email: user.email,
      role: user.role || "manager",
      storeCode: user.store_code,
      userId: user.id,
    });
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(500).json({ error: "Authentication failed" });
  }
}
