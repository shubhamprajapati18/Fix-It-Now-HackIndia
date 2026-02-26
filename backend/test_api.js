const axios = require("axios");

async function testSubmit() {
  try {
    const res = await axios.post("http://localhost:5000/api/issues", {
      title: "CURL Test Issue",
      description: "Testing API without JWT",
      location: "Curl Land",
      pincode: "000000",
      category: "other",
      location_lat: 19.1,
      location_lng: 72.8,
    });
    console.log("Success:", res.data);
  } catch (err) {
    console.error("Error:", err.response ? err.response.data : err.message);
  }
}

testSubmit();
