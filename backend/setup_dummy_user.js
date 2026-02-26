const { supabase } = require("./supabaseClient");
const fs = require("fs");

async function checkDummy() {
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("full_name", "Anonymous Citizen")
    .limit(1);
  fs.writeFileSync("dummy_id.txt", data[0].id);
}
checkDummy();
