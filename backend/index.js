const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { supabase } = require("./supabaseClient");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

const issuesRouter = require("./routes/issues");
const adminRouter = require("./routes/admin");
const otpRouter = require("./routes/otp");
const blogsRouter = require("./routes/blogs");

// Basic Route
app.get("/", (req, res) => {
  res.send("Civic Sense Backend is running!");
});

app.use("/api/issues", issuesRouter);
app.use("/api/admin", adminRouter);
app.use("/api/otp", otpRouter);
app.use("/api/blogs", blogsRouter);

// Health Check
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
