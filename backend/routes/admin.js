const express = require("express");
const { supabase } = require("../supabaseClient");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// POST /api/admin/municipal - Create a new municipal admin
// Only reachable by master admins
router.post("/municipal", requireAuth, async (req, res) => {
  try {
    if (
      !req.user ||
      (req.user.role !== "master_admin" && req.user.role !== "master")
    ) {
      return res
        .status(403)
        .json({ error: "Forbidden: Master Admin access required" });
    }

    const { email, password, full_name, district_code } = req.body;

    if (!email || !password || !full_name || !district_code) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 1. Create the user in Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          role: "municipal_admin",
          full_name: full_name,
          district_code: district_code,
        },
      });

    if (authError) {
      console.error("Auth Create Error:", authError);
      return res.status(400).json({ error: authError.message });
    }

    const newUserId = authData.user.id;

    // 2. Insert into public.users table
    const { error: dbError } = await supabase.from("users").insert([
      {
        id: newUserId,
        role: "municipal_admin",
        full_name: full_name,
        district_code: district_code,
      },
    ]);

    if (dbError) {
      console.error("DB Insert Error:", dbError);
      // Ideally we would delete the auth user here as a rollback
      return res
        .status(500)
        .json({ error: "Failed to create municipal admin profile" });
    }

    res.status(201).json({
      message: "Municipal Admin created successfully",
      user: { id: newUserId, email, full_name, district_code },
    });
  } catch (error) {
    console.error("Municipal Admin Creation Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/admin/municipal - List all municipal admins
router.get("/municipal", requireAuth, async (req, res) => {
  try {
    if (
      !req.user ||
      (req.user.role !== "master_admin" && req.user.role !== "master")
    ) {
      return res
        .status(403)
        .json({ error: "Forbidden: Master Admin access required" });
    }

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", "municipal_admin")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("DB Fetch Error:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch municipal admins" });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Municipal Admin Fetch Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/admin/municipal/:id - Delete a municipal admin
router.delete("/municipal/:id", requireAuth, async (req, res) => {
  try {
    if (
      !req.user ||
      (req.user.role !== "master_admin" && req.user.role !== "master")
    ) {
      return res
        .status(403)
        .json({ error: "Forbidden: Master Admin access required" });
    }

    const { id } = req.params;

    // 1. Delete from Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    if (authError) {
      console.error("Auth Delete Error:", authError);
      return res.status(400).json({ error: authError.message });
    }

    // 2. The public.users table should cascade delete due to foreign key ON DELETE CASCADE
    // But we can explicitly delete if needed, skipping for now relying on cascade.

    res.status(200).json({ message: "Municipal Admin deleted successfully" });
  } catch (error) {
    console.error("Municipal Admin Delete Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
