const mongoose = require("mongoose");

const thyroidSchema = new mongoose.Schema({
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    TSH: {
        type: Number,
        required: true
    },
    T3: {
        type: Number,
        required: true
    },
    T4: {
        type: Number,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model("ThyroidRecord", thyroidSchema);