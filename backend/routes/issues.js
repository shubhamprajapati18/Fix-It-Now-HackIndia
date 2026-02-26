const express = require("express");
const axios = require("axios");
const { supabase } = require("../supabaseClient");
const { requireAuth, optionalAuth } = require("../middleware/authMiddleware");
const router = express.Router();

// AI Service Configuration
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

// POST /api/issues - Create a new issue (Citizen Reporting Flow)
router.post("/", optionalAuth, async (req, res) => {
  try {
    const {
      title,
      description,
      location,
      pincode,
      category,
      image_data,
      location_lat,
      location_lng,
      name,
      phone,
      aadhar,
    } = req.body;

    // Contact Python AI Service for Classification and Priority Prediction
    let aiCategory = category || "unclassified";
    let aiConfidence = null;
    let aiPriority = "medium"; // default fallback priority

    try {
      // In a real app we would pass the actual image file/base64 via formData
      // For this phase, we'll hit the newly modified endpoint with description
      const aiResponse = await axios.post(`${AI_SERVICE_URL}/predict`, {
        description: description,
        image: image_data || "mock_image_data",
      });

      if (aiResponse.data) {
        aiCategory = aiResponse.data.category || aiCategory;
        aiConfidence = aiResponse.data.confidence || null;
        if (aiResponse.data.priority) {
          aiPriority = aiResponse.data.priority.toLowerCase();
        }
      }
    } catch (aiError) {
      console.warn(
        "⚠️ AI Service unreachable or failed. Falling back to default values.",
      );
      console.error(aiError.message);
    }

    // Use the authenticated user's ID, or fallback to the generic "Anonymous Citizen" ID
    const DUMMY_REPORTER_ID = "14015746-53d5-4719-9c3e-bbc18a88fba8";
    const finalReporterId = req.user ? req.user.id : DUMMY_REPORTER_ID;

    const address = `${location}, Pincode: ${pincode}`;

    const { data, error } = await supabase
      .from("issues")
      .insert([
        {
          title,
          description,
          address,
          location_lat,
          location_lng,
          ai_category: aiCategory,
          ai_confidence: aiConfidence,
          status: "open",
          priority: aiPriority, // Dynamically set from the AI Model
          reporter_id: finalReporterId,
          reporter_name: name,
          reporter_phone: phone,
          reporter_aadhar: aadhar,
          image_url: image_data, // Store the base64 image data in the DB
          district_code: pincode.toString().trim(), // Save pincode as district_code for municipal filtering
        },
      ])
      .select();

    if (error) {
      console.error("Supabase Insert Error:", error);
      return res
        .status(500)
        .json({ error: "Failed to save issue to database" });
    }

    res
      .status(201)
      .json({ message: "Issue reported successfully", issue: data[0] });
  } catch (err) {
    console.error("Error creating issue:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/issues - Fetch all issues (Admin Dashboard Flow)
router.get("/", requireAuth, async (req, res) => {
  try {
    let query = supabase.from("issues").select("*");

    console.log("----- [API /api/issues] DEBUGGING MUNICIPAL FILTER -----");
    console.log("User Data:", {
      role: req.user?.role,
      district_code: req.user?.district_code,
    });

    // If user is a municipal admin, fetch only issues in their district
    if (
      req.user &&
      (req.user.role === "municipal_admin" || req.user.role === "municipal")
    ) {
      if (req.user.district_code) {
        // District code might be "273001, 273002, 273006"
        let pincodes = req.user.district_code;

        // Handle array formatting or comma strings gracefully
        if (typeof pincodes === "string") {
          pincodes = pincodes
            .split(",")
            .map((code) => code.trim().replace(/['"]/g, ""));
        } else if (Array.isArray(pincodes)) {
          pincodes = pincodes.map((code) => code.trim().replace(/['"]/g, ""));
        }

        console.log("Applying District Filter Array:", pincodes);
        query = query.in("district_code", pincodes);
      } else {
        // If they don't have a district_code set, maybe return empty or handle gracefully
        console.log("Block: User has no district code attached.");
        query = query.eq("district_code", "unassigned_or_invalid");
      }
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Supabase Fetch Error:", error);
      return res.status(500).json({ error: "Failed to fetch issues" });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching issues:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/issues/citizen/:phone - Fetch issues reported by a specific citizen
router.get("/citizen/:phone", async (req, res) => {
  try {
    const { phone } = req.params;

    const { data, error } = await supabase
      .from("issues")
      .select("*")
      .eq("reporter_phone", phone)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase Fetch Error API citizen:", error);
      return res.status(500).json({ error: "Failed to fetch citizen issues" });
    }

    res.status(200).json(data || []);
  } catch (err) {
    console.error("Error fetching citizen issues:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/issues/:id - Fetch a specific issue by ID
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("issues")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Supabase Fetch Error:", error);
      return res.status(500).json({ error: "Failed to fetch issue details" });
    }

    if (!data) {
      return res.status(404).json({ error: "Issue not found" });
    }

    // Security: Only allow municipal admins to see issues in their assigned pincodes
    if (
      req.user &&
      (req.user.role === "municipal_admin" || req.user.role === "municipal")
    ) {
      let validDistricts = req.user.district_code || [];
      if (typeof validDistricts === "string") {
        validDistricts = validDistricts
          .split(",")
          .map((d) => d.trim().replace(/['"]/g, ""));
      } else if (Array.isArray(validDistricts)) {
        validDistricts = validDistricts.map((d) =>
          d.trim().replace(/['"]/g, ""),
        );
      }

      const issueDistrict = data.district_code
        ? data.district_code.toString().trim().replace(/['"]/g, "")
        : "";

      if (!validDistricts.includes(issueDistrict)) {
        return res
          .status(403)
          .json({ error: "Forbidden: Issue not in your jurisdiction" });
      }
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching issue details:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/issues/:id - Update an issue's status or priority (Admin Flow)
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, assigned_municipality_id } = req.body;

    // Build the update payload dynamically based on what was provided
    const updateData = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (assigned_municipality_id !== undefined)
      updateData.assigned_municipality_id = assigned_municipality_id;
    updateData.updated_at = new Date().toISOString();

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No update fields provided" });
    }

    const { data, error } = await supabase
      .from("issues")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) {
      console.error("Supabase Update Error:", error);
      return res.status(500).json({ error: "Failed to update issue" });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Issue not found" });
    }

    res
      .status(200)
      .json({ message: "Issue updated successfully", issue: data[0] });
  } catch (err) {
    console.error("Error updating issue:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/issues/:id - Delete an issue permanently (Master Admin only)
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    // Only master admins can delete issues
    if (req.user?.role !== "master" && req.user?.role !== "master_admin") {
      return res
        .status(403)
        .json({ error: "Forbidden: Only Master Admins can delete issues" });
    }

    const { id } = req.params;

    const { data, error } = await supabase
      .from("issues")
      .delete()
      .eq("id", id)
      .select();

    if (error) {
      console.error("Supabase Delete Error:", error);
      return res.status(500).json({ error: "Failed to delete issue" });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Issue not found" });
    }

    res
      .status(200)
      .json({ message: "Issue deleted successfully", issue: data[0] });
  } catch (err) {
    console.error("Error deleting issue:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
