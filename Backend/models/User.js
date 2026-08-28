const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        // Optional — Google OAuth users won't have a password
        password: { type: String, default: null },
        profileImageUrl: { type: String, default: null },
        // Populated for Google OAuth users
        googleId: { type: String, default: null },
    },
    { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
