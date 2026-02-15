const express = require("express");
const router = express.Router();
const ThyroidRecord = require("../models/ThyroidRecord");
const User = require("../models/User");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");

const { verifyToken, doctorOnly, patientOnly } = require("../middleware/authMiddleware");


// =======================================================
// 🔬 THYROID RISK CLASSIFICATION
// =======================================================
function classifyThyroid(TSH, T3, T4) {

    if (
        TSH >= 0.4 && TSH <= 4.0 &&
        T3 >= 0.8 && T3 <= 2.0 &&
        T4 >= 5.0 && T4 <= 12.0
    ) return "Normal";

    if (TSH > 4.0 && (T3 < 0.8 || T4 < 5.0))
        return "Hypothyroidism";

    if (TSH < 0.4 && (T3 > 2.0 || T4 > 12.0))
        return "Hyperthyroidism";

    return "Borderline / Needs Medical Review";
}


// =======================================================
// 🧠 SMART INTERPRETATION
// =======================================================
function generateInterpretation(classification, TSH) {

    if (classification === "Normal")
        return "Your thyroid hormone levels are within normal clinical range.";

    if (classification === "Hypothyroidism")
        return `Elevated TSH (${TSH}) suggests reduced thyroid activity. Consultation advised.`;

    if (classification === "Hyperthyroidism")
        return `Low TSH (${TSH}) suggests overactive thyroid function. Medical evaluation recommended.`;

    return "Borderline thyroid values detected. Further evaluation recommended.";
}


// =======================================================
// 📈 LINEAR REGRESSION
// =======================================================
function linearRegression(values) {

    const n = values.length;
    const xValues = Array.from({ length: n }, (_, i) => i);

    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope =
        (n * sumXY - sumX * sumY) /
        (n * sumXX - sumX * sumX);

    const intercept =
        (sumY - slope * sumX) / n;

    return { slope, intercept };
}


// =======================================================
// 📊 STANDARD DEVIATION
// =======================================================
function calculateStdDev(values) {

    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    const variance =
        values.reduce((sum, value) =>
            sum + Math.pow(value - mean, 2), 0
        ) / values.length;

    return Math.sqrt(variance);
}


// =======================================================
// 🚨 ANOMALY DETECTION
// =======================================================
function detectAnomalies(values) {

    const stdDev = calculateStdDev(values);
    const anomalies = [];

    for (let i = 1; i < values.length; i++) {

        const difference = Math.abs(values[i] - values[i - 1]);

        if (difference > 2 * stdDev) {
            anomalies.push({
                index: i,
                previousValue: values[i - 1],
                currentValue: values[i],
                difference: Number(difference.toFixed(2))
            });
        }
    }

    return anomalies;
}


// =======================================================
// 1️⃣ ADD RECORD (Doctor Only)
// =======================================================
router.post("/add", verifyToken, doctorOnly, async (req, res) => {
    try {

        const { patientEmail, date, TSH, T3, T4 } = req.body;

        const patient = await User.findOne({ email: patientEmail });

        if (!patient || patient.role !== "patient")
            return res.status(404).json({ message: "Patient not found" });

        const newRecord = new ThyroidRecord({
            patient: patient._id,
            doctor: req.user.id,
            date,
            TSH,
            T3,
            T4
        });

        await newRecord.save();

        res.status(201).json({
            message: "Record added successfully",
            data: newRecord
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// =======================================================
// 2️⃣ GET MY RECORDS
// =======================================================
router.get("/my-records", verifyToken, patientOnly, async (req, res) => {
    try {

        const records = await ThyroidRecord.find({
            patient: req.user.id
        }).populate("doctor", "name email");

        res.json({
            count: records.length,
            data: records
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// =======================================================
// 3️⃣ CSV UPLOAD
// =======================================================
const upload = multer({ dest: "uploads/" });

router.post(
    "/upload-csv",
    verifyToken,
    doctorOnly,
    upload.single("file"),
    async (req, res) => {
        try {

            const results = [];

            fs.createReadStream(req.file.path)
                .pipe(csv())
                .on("data", (data) => results.push(data))
                .on("end", async () => {

                    for (let row of results) {

                        const patient = await User.findOne({
                            email: row.patientEmail
                        });

                        if (patient && patient.role === "patient") {
                            await ThyroidRecord.create({
                                patient: patient._id,
                                doctor: req.user.id,
                                date: row.date,
                                TSH: Number(row.TSH),
                                T3: Number(row.T3),
                                T4: Number(row.T4)
                            });
                        }
                    }

                    fs.unlinkSync(req.file.path);

                    res.status(201).json({
                        message: "CSV uploaded successfully",
                        count: results.length
                    });
                });

        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
);


// =======================================================
// 4️⃣ AI REGRESSION + CONFIDENCE + ANOMALY DETECTION
// =======================================================
router.get("/predict", verifyToken, patientOnly, async (req, res) => {
    try {

        const records = await ThyroidRecord.find({
            patient: req.user.id
        }).sort({ date: 1 });

        if (records.length < 3)
            return res.status(400).json({
                message: "Minimum 3 records required"
            });

        const TSHValues = records.map(r => r.TSH);
        const T3Values = records.map(r => r.T3);
        const T4Values = records.map(r => r.T4);

        const tshModel = linearRegression(TSHValues);
        const t3Model = linearRegression(T3Values);
        const t4Model = linearRegression(T4Values);

        const tshStd = calculateStdDev(TSHValues);
        const t3Std = calculateStdDev(T3Values);
        const t4Std = calculateStdDev(T4Values);

        const tshAnomalies = detectAnomalies(TSHValues);
        const t3Anomalies = detectAnomalies(T3Values);
        const t4Anomalies = detectAnomalies(T4Values);

        const futurePredictions = [];
        const startIndex = records.length;

        for (let i = 1; i <= 3; i++) {

            const x = startIndex + i - 1;

            const predictedTSH = tshModel.slope * x + tshModel.intercept;
            const predictedT3 = t3Model.slope * x + t3Model.intercept;
            const predictedT4 = t4Model.slope * x + t4Model.intercept;

            futurePredictions.push({
                month: `Month ${i}`,

                predictedTSH: Number(predictedTSH.toFixed(2)),
                TSH_CI_Lower: Number((predictedTSH - 1.96 * tshStd).toFixed(2)),
                TSH_CI_Upper: Number((predictedTSH + 1.96 * tshStd).toFixed(2)),

                predictedT3: Number(predictedT3.toFixed(2)),
                T3_CI_Lower: Number((predictedT3 - 1.96 * t3Std).toFixed(2)),
                T3_CI_Upper: Number((predictedT3 + 1.96 * t3Std).toFixed(2)),

                predictedT4: Number(predictedT4.toFixed(2)),
                T4_CI_Lower: Number((predictedT4 - 1.96 * t4Std).toFixed(2)),
                T4_CI_Upper: Number((predictedT4 + 1.96 * t4Std).toFixed(2))
            });
        }

        const latest = records[records.length - 1];

        const classification = classifyThyroid(
            latest.TSH,
            latest.T3,
            latest.T4
        );

        const interpretation = generateInterpretation(
            classification,
            latest.TSH
        );

        res.json({
            message: "Advanced AI Thyroid Prediction",

            latestValues: latest,
            classification,
            interpretation,

            regressionPredictions: futurePredictions,

            anomalies: {
                TSH: tshAnomalies,
                T3: t3Anomalies,
                T4: t4Anomalies
            }
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


module.exports = router;