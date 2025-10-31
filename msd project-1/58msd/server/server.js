import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { JSONFilePreset } from "lowdb/node";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure data and uploads directories exist
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const dataDir = path.join(projectRoot, "data");
const uploadsDir = path.join(projectRoot, "uploads");

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Database setup (Lowdb JSON file)
const dbPath = path.join(dataDir, "db.json");
const db = await JSONFilePreset(dbPath, { uploads: [], lastId: 0 });

// Middlewares
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

// Multer storage
const storage = multer.diskStorage({
    destination: function (_req, _file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (_req, file, cb) {
        const timestamp = Date.now();
        const safeOriginal = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        cb(null, `${timestamp}-${safeOriginal}`);
    }
});

const upload = multer({ storage });

// Routes
app.get("/", (_req, res) => {
    res.type("text").send("API running. Try GET /api/health or POST /api/upload");
});

app.get("/api", (_req, res) => {
    res.json({ ok: true, message: "API root" });
});

app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
});

// POST /api/upload (multipart/form-data) field: file; optional: uploaderName, uploaderEmail, metadata (JSON string)
app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const { originalname, filename, size, mimetype } = req.file;
        const { uploaderName = null, uploaderEmail = null, metadata = null } = req.body || {};

        let metadataString = null;
        if (metadata) {
            try {
                metadataString = JSON.stringify(typeof metadata === "string" ? JSON.parse(metadata) : metadata);
            } catch {
                metadataString = JSON.stringify({ raw: metadata });
            }
        }

        const uploadedAt = new Date().toISOString();
        const newId = (db.data.lastId || 0) + 1;
        db.data.lastId = newId;
        const record = {
            id: newId,
            original_name: originalname,
            stored_name: filename,
            size,
            mime_type: mimetype,
            uploader_name: uploaderName,
            uploader_email: uploaderEmail,
            metadata: metadataString ? JSON.parse(metadataString) : null,
            uploaded_at: uploadedAt,
            file_url: `/uploads/${filename}`
        };
        db.data.uploads.unshift(record);
        await db.write();
        res.status(201).json(record);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to upload file" });
    }
});

// GET /api/uploads - list records
app.get("/api/uploads", (_req, res) => {
    try {
        res.json(db.data.uploads);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch uploads" });
    }
});

// GET /api/uploads/:id - single record
app.get("/api/uploads/:id", (req, res) => {
    try {
        const id = Number(req.params.id);
        const row = db.data.uploads.find(u => u.id === id);
        if (!row) return res.status(404).json({ error: "Not found" });
        res.json(row);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch record" });
    }
});

// DELETE /api/uploads/:id - delete record and file
app.delete("/api/uploads/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const row = db.data.uploads.find(u => u.id === id);
        if (!row) return res.status(404).json({ error: "Not found" });
        db.data.uploads = db.data.uploads.filter(u => u.id !== id);
        await db.write();

        const filePath = path.join(uploadsDir, row.stored_name);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete record" });
    }
});

app.listen(PORT, () => {
    console.log(`API server listening on http://localhost:${PORT}`);
});


