const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await s.auth.signInWithPassword({
    email: "municipal@civicsense.com",
    password: "password123",
  });

  if (error) {
    console.error("Auth Error:", error);
    return;
  }

  console.log("Got token for user");

  try {
    const res = await axios.get(
      "http://localhost:5000/api/issues/9fc53a68-6b92-453b-842c-7306d786ac2b",
      {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      },
    );
    console.log("SUCCESS:", res.data.id);
  } catch (e) {
    if (e.response) {
      console.error("SERVER ERROR:", e.response.status, e.response.data);
    } else {
      console.error("REQUEST ERROR:", e.message);
    }
  }
}
test();
