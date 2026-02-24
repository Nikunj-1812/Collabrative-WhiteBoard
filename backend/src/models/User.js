const mongoose = require("mongoose");

// In-memory user store for development (fallback when MongoDB is not available)
const inMemoryUsers = new Map();

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { 
    versionKey: false,
    toJSON: {
      transform: function(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      }
    }
  }
);

// Add virtual for id
userSchema.virtual('id').get(function() {
  return this._id.toString();
});

let UserModel;

try {
  UserModel = mongoose.model("User", userSchema);
} catch (err) {
  // Model already exists
  UserModel = mongoose.models.User;
}

// Create a proxy to handle both MongoDB and in-memory storage
class UserProxy {
  static async findOne(query) {
    try {
      // Try MongoDB first
      if (mongoose.connection.readyState === 1) {
        const user = await UserModel.findOne(query);
        if (user) {
          // Convert to plain object with id field
          const userObj = user.toObject();
          userObj.id = user._id.toString();
          delete userObj._id;
          return userObj;
        }
      }
    } catch (err) {
      console.log("[User] MongoDB query failed, falling back to in-memory store");
    }

    // Fallback to in-memory store
    if (query.email) {
      return inMemoryUsers.get(query.email.toLowerCase()) || null;
    }
    if (query.id) {
      for (const user of inMemoryUsers.values()) {
        if (user.id === query.id) return user;
      }
    }
    return null;
  }

  static async create(data) {
    try {
      // Try MongoDB first
      if (mongoose.connection.readyState === 1) {
        const user = await UserModel.create(data);
        // Convert to plain object with id field
        const userObj = user.toObject();
        userObj.id = user._id.toString();
        delete userObj._id;
        return userObj;
      }
    } catch (err) {
      console.log("[User] MongoDB create failed, falling back to in-memory store");
    }

    // Fallback to in-memory store
    const user = {
      id: require("crypto").randomUUID(),
      ...data,
      createdAt: new Date()
    };
    inMemoryUsers.set(data.email.toLowerCase(), user);
    return user;
  }
}

module.exports = UserProxy;
