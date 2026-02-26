const { supabase } = require("../supabaseClient");

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "Missing or invalid authorization header" });
    }

    const token = authHeader.split(" ")[1];

    // Verify token using Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res
        .status(401)
        .json({ error: "Invalid token or session expired" });
    }

    // Fetch the custom role from our public.users table
    const { data: dbUser } = await supabase
      .from("users")
      .select("role, district_code")
      .eq("id", user.id)
      .single();

    if (dbUser) {
      user.role = dbUser.role;
      user.district_code = dbUser.district_code;
    } else {
      user.role = user.user_metadata?.role;
      user.district_code =
        user.user_metadata?.district_code || user.user_metadata?.pincode;
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    res
      .status(500)
      .json({ error: "Internal server error during authentication" });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(); // Proceed without req.user
    }

    const token = authHeader.split(" ")[1];

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (!error && user) {
      req.user = user;
    }
    next();
  } catch (err) {
    console.error("Optional Auth Middleware Error:", err);
    next(); // Proceed without user on error
  }
};

module.exports = { requireAuth, optionalAuth };
