const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");
const basicAuth = require("basic-auth");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..", "client"))); // Serve from D:\Scholarship Form\client

const uploadsDir =
  process.env.RENDER_DISK_MOUNT_PATH || path.join(__dirname, "Uploads");
fs.ensureDirSync(uploadsDir);

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const firstName = req.body.firstName || "Unknown";
    const lastName = req.body.lastName || "Student";
    const studentId = `${firstName}_${lastName}`
      .replace(/\s+/g, "_")
      .toLowerCase();
    const studentDir = path.join(uploadsDir, studentId);
    fs.ensureDirSync(studentDir);
    cb(null, studentDir);
  },
  filename: (req, file, cb) => {
    let filename;
    switch (file.fieldname) {
      case "profileImage":
        filename = "profile.jpg";
        break;
      case "cnicFront":
        filename = "cnic_front.jpg";
        break;
      case "cnicBack":
        filename = "cnic_back.jpg";
        break;
      case "matricCert":
        filename = "matric_certificate.jpg";
        break;
      case "interCert":
        filename = "intermediate_certificate.jpg";
        break;
      case "domicileDoc":
        filename = "domicile_certificate.jpg";
        break;
      default:
        filename = file.originalname;
    }
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

// Handle form submission
app.post(
  "/submit",
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "cnicFront", maxCount: 1 },
    { name: "cnicBack", maxCount: 1 },
    { name: "matricCert", maxCount: 1 },
    { name: "interCert", maxCount: 1 },
    { name: "domicileDoc", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      console.log("Received /submit request");
      console.log("Form data:", req.body);
      console.log("Files:", Object.keys(req.files || {}));

      const formData = req.body;
      const firstName = formData.firstName || "Unknown";
      const lastName = formData.lastName || "Student";
      const studentId = `${firstName}_${lastName}`
        .replace(/\s+/g, "_")
        .toLowerCase();
      const studentDir = path.join(uploadsDir, studentId);

      const requiredFields = ["firstName", "lastName", "cnic", "email"];
      for (const field of requiredFields) {
        if (!formData[field]) {
          console.log(`Missing field: ${field}`);
          return res
            .status(400)
            .json({ message: `Missing required field: ${field}` });
        }
      }

      if (!/^\d{13}$/.test(formData.cnic)) {
        return res
          .status(400)
          .json({ message: "CNIC must be 13 digits without spaces or dashes" });
      }

      const dataPath = path.join(studentDir, "data.json");
      await fs.writeJson(dataPath, formData, { spaces: 2 });

      res
        .status(200)
        .json({ message: "Application submitted successfully!", studentId });
    } catch (error) {
      console.error("Submission error:", error);
      res.status(500).json({
        message: "Error submitting application",
        error: error.message,
      });
    }
  }
);

// Multer error handling
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error("Multer error:", error);
    return res
      .status(400)
      .json({ message: `File upload error: ${error.message}` });
  }
  console.error("General error:", error);
  res.status(500).json({ message: "Server error", error: error.message });
});

// List all students
app.get("/students", auth, async (req, res) => {
  try {
    const students = await fs.readdir(uploadsDir);
    res.json({ students });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ message: "Error fetching students" });
  }
});

// View specific student data
app.get("/students/:studentId", auth, async (req, res) => {
  const { studentId } = req.params;
  const studentDir = path.join(UploadsDir, studentId);
  try {
    if (!(await fs.pathExists(studentDir))) {
      return res.status(404).json({ message: "Student not found" });
    }
    const dataPath = path.join(studentDir, "data.json");
    const formData = await fs.readJson(dataPath);
    const files = await fs.readdir(studentDir);
    const fileList = files.filter((f) => f !== "data.json");
    res.json({ formData, files: fileList });
  } catch (error) {
    console.error("Error fetching student:", error);
    res.status(500).json({ message: "Error fetching student data" });
  }
});

// Serve student files
app.get("/students/:studentId/files/:filename", auth, (req, res) => {
  const { studentId, filename } = req.params;
  const filePath = path.join(UploadsDir, studentId, filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: "File not found" });
  }
});

function auth(req, res, next) {
  const user = basicAuth(req);
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "password";

  if (!user || user.name !== adminUsername || user.pass !== adminPassword) {
    res.set("WWW-Authenticate", 'Basic realm="Authorization Required"');
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
