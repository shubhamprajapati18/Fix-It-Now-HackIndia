const express = require("express");
const { supabase } = require("../supabaseClient");
const { requireAuth } = require("../middleware/authMiddleware");
const router = express.Router();

// GET /api/blogs - Fetch all blogs (Public route for civic-spark homepage)
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("blogs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase Fetch Blogs Error:", error);
      return res.status(500).json({ error: "Failed to fetch blogs" });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching blogs:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/blogs/:id - Fetch a single blog by ID (Public route for article page)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("blogs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Supabase Fetch Single Blog Error:", error);
      return res.status(500).json({ error: "Failed to fetch blog article" });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching blog article:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/blogs - Create a new blog article (Protected - Master Admin only)
router.post("/", requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "master" && req.user?.role !== "master_admin") {
      return res
        .status(403)
        .json({ error: "Forbidden: Only Master Admins can create blogs." });
    }

    const {
      title,
      excerpt,
      content,
      image_url,
      category,
      author_name,
      read_time,
    } = req.body;

    if (!title || !content || !author_name) {
      return res
        .status(400)
        .json({ error: "Title, content, and author are required." });
    }

    const { data, error } = await supabase
      .from("blogs")
      .insert([
        {
          title,
          excerpt: excerpt || "Click to read more...",
          content,
          image_url:
            image_url ||
            "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&h=400&fit=crop", // default placeholder
          category: category || "Announcements",
          author_name,
          read_time: read_time || "5 min read",
        },
      ])
      .select();

    if (error) {
      console.error("Supabase Insert Blog Error:", error);
      return res.status(500).json({ error: "Failed to create blog post" });
    }

    res
      .status(201)
      .json({ message: "Blog published successfully", blog: data[0] });
  } catch (err) {
    console.error("Error creating blog:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /api/blogs/:id - Update an existing blog article (Protected)
router.put("/:id", requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "master" && req.user?.role !== "master_admin") {
      return res
        .status(403)
        .json({ error: "Forbidden: Only Master Admins can edit blogs." });
    }

    const { id } = req.params;
    const {
      title,
      excerpt,
      content,
      image_url,
      category,
      author_name,
      read_time,
    } = req.body;

    const { data, error } = await supabase
      .from("blogs")
      .update({
        title,
        excerpt,
        content,
        image_url,
        category,
        author_name,
        read_time,
      })
      .eq("id", id)
      .select();

    if (error) {
      console.error("Supabase Update Blog Error:", error);
      return res.status(500).json({ error: "Failed to update blog post" });
    }

    res
      .status(200)
      .json({ message: "Blog updated successfully", blog: data[0] });
  } catch (err) {
    console.error("Error updating blog:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/blogs/:id - Delete a blog article (Protected)
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "master" && req.user?.role !== "master_admin") {
      return res
        .status(403)
        .json({ error: "Forbidden: Only Master Admins can delete blogs." });
    }

    const { id } = req.params;

    const { data, error } = await supabase
      .from("blogs")
      .delete()
      .eq("id", id)
      .select();

    if (error) {
      console.error("Supabase Delete Blog Error:", error);
      return res.status(500).json({ error: "Failed to delete blog post" });
    }

    res
      .status(200)
      .json({ message: "Blog deleted successfully", deleted: data });
  } catch (err) {
    console.error("Error deleting blog:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
