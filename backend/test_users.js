require("dotenv").config();
const { supabase } = require("./supabaseClient");

async function run() {
  // 1. Get all users from auth.users
  const { data: authData, error: authError } =
    await supabase.auth.admin.listUsers();
  console.log("Auth Users:", authData?.users?.length);

  if (authData?.users?.length > 0) {
    const user = authData.users[0];
    // 2. Insert into public.users if not exists
    const { data: publicUser, error: publicError } = await supabase
      .from("users")
      .upsert({
        id: user.id,
        role: "citizen",
        full_name: user.email || "Test User",
      })
      .select();

    console.log("Upserted Public User:", publicUser);
    console.log("Upsert Error:", publicError);
  }
}

run();
