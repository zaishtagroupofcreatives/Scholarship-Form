const express = require("express");
const multer = require("multer");
const path = require("path");
const { put, list } = require("@vercel/blob");
const basicAuth = require("basic-auth");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..", "client")));

// Multer storage configuration
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
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
    console.log("Received /submit POST request from:", req.ip, "Origin:", req.headers.origin);
    try {
      console.log("Received /submit request");
      const formData = req.body;
      const files = req.files;

      const requiredFields = ["firstName", "lastName", "cnic", "email"];
      for (const field of requiredFields) {
        if (!formData[field]) {
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

      const studentId = `${formData.firstName}_${formData.lastName}`
        .replace(/\s+/g, "_")
        .toLowerCase();

      // Upload files to Vercel Blob
      for (const fieldname in files) {
        const file = files[fieldname][0];
        let filename;
        switch (fieldname) {
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
        const blobPath = `uploads/${studentId}/${filename}`;
        await put(blobPath, file.buffer, { access: "public" });
      }

      // Upload form data as JSON to Vercel Blob
      const dataPath = `uploads/${studentId}/data.json`;
      await put(dataPath, JSON.stringify(formData, null, 2), {
        access: "public",
      });

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
    const { blobs } = await list({ prefix: "uploads/" });
    const students = [
      ...new Set(
        blobs.map((blob) => blob.pathname.split("/")[1])
      ),
    ];
    res.json({ students });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ message: "Error fetching students" });
  }
});

// View specific student data
app.get("/students/:studentId", auth, async (req, res) => {
  const { studentId } = req.params;
  try {
    const { blobs } = await list({ prefix: `uploads/${studentId}/` });
    const dataBlob = blobs.find((blob) => blob.pathname.endsWith("data.json"));

    if (!dataBlob) {
      return res.status(404).json({ message: "Student not found" });
    }

    const dataResponse = await fetch(dataBlob.url);
    const formData = await dataResponse.json();

    const files = blobs
      .filter((blob) => !blob.pathname.endsWith("data.json"))
      .map((blob) => blob.pathname.split("/").pop());

    res.json({ formData, files });
  } catch (error) {
    console.error("Error fetching student:", error);
    res.status(500).json({ message: "Error fetching student data" });
  }
});

// Serve student files
app.get("/students/:studentId/files/:filename", auth, async (req, res) => {
  const { studentId, filename } = req.params;
  try {
    const { blobs } = await list({
      prefix: `uploads/${studentId}/${filename}`,
    });
    const fileBlob = blobs[0];

    if (!fileBlob) {
      return res.status(404).json({ message: "File not found" });
    }

    res.redirect(fileBlob.url);
  } catch (error) {
    console.error("Error fetching file:", error);
    res.status(500).json({ message: "Error fetching file" });
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

app.get("/", (req, res) => {
  res.json({ message: "Server is up and running!" });
});


app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
