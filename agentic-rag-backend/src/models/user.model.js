import mongoose from 'mongoose';

/**
 * User Model
 * 
 * Purpose: Store user information for:
 * - Google OAuth authentication
 * - User profile management
 * - Admin role management
 * - Usage tracking per user
 * 
 * Note: Currently prepared but not actively used.
 * Will be activated when implementing Google OAuth.
 */

const userSchema = new mongoose.Schema(
    {
        // Google OAuth fields
        googleId: {
            type: String,
            unique: true,
            sparse: true,
            index: true,
            description: 'Google OAuth ID',
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
            description: 'User email address',
        },

        // Profile information
        profile: {
            name: {
                type: String,
                required: true,
                trim: true,
            },
            picture: {
                type: String,
                description: 'Profile picture URL from Google',
            },
            locale: {
                type: String,
                default: 'en',
            },
        },

        // Role-based access control
        role: {
            type: String,
            enum: ['user', 'admin', 'moderator'],
            default: 'user',
            index: true,
            description: 'User role for authorization',
        },

        // Account status
        status: {
            type: String,
            enum: ['active', 'suspended', 'deleted'],
            default: 'active',
            index: true,
        },

        // Usage tracking
        usage: {
            totalQueries: {
                type: Number,
                default: 0,
                description: 'Total number of queries made',
            },
            lastQueryAt: {
                type: Date,
                description: 'Last query timestamp',
            },
            totalSavedChats: {
                type: Number,
                default: 0,
                description: 'Number of saved conversations',
            },
            // Daily rate limiting
            dailyQueries: {
                type: Number,
                default: 0,
                description: 'Queries made in current day',
            },
            dailyLimit: {
                type: Number,
                default: 50,
                description: 'Maximum queries per day',
            },
            dailyResetAt: {
                type: Date,
                default: Date.now,
                description: 'When daily count resets',
            },
            dailyTokens: {
                type: Number,
                default: 0,
                description: 'Tokens used in current day',
            },
        },

        // Preferences (for future customization)
        preferences: {
            language: {
                type: String,
                default: 'en',
            },
            theme: {
                type: String,
                enum: ['light', 'dark', 'auto'],
                default: 'auto',
            },
            emailNotifications: {
                type: Boolean,
                default: true,
            },
        },

        // Session management
        lastLoginAt: {
            type: Date,
            description: 'Last login timestamp',
        },

        lastLoginIp: {
            type: String,
            description: 'Last login IP address',
        },

        // Metadata
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
            description: 'Flexible metadata for future extensions',
        },
    },
    {
        timestamps: true,
        collection: 'users',
    }
);

// Indexes
userSchema.index({ email: 1, status: 1 });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ 'usage.lastQueryAt': -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function () {
    return this.profile.name;
});

// Instance methods

/**
 * Check if user is admin
 */
userSchema.methods.isAdmin = function () {
    return this.role === 'admin';
};

/**
 * Check if user is active
 */
userSchema.methods.isActive = function () {
    return this.status === 'active';
};

/**
 * Update last login info
 */
userSchema.methods.updateLastLogin = async function (ip) {
    this.lastLoginAt = new Date();
    this.lastLoginIp = ip;
    return this.save();
};

/**
 * Increment query count
 */
userSchema.methods.incrementQueryCount = async function () {
    this.usage.totalQueries += 1;
    this.usage.lastQueryAt = new Date();
    return this.save();
};

/**
 * Increment saved chats count
 */
userSchema.methods.incrementSavedChats = async function () {
    this.usage.totalSavedChats += 1;
    return this.save();
};

// Static methods

/**
 * Find or create user from Google OAuth profile
 */
userSchema.statics.findOrCreateFromGoogle = async function (profile) {
    let user = await this.findOne({ googleId: profile.id });

    if (!user) {
        user = await this.create({
            googleId: profile.id,
            email: profile.emails[0].value,
            profile: {
                name: profile.displayName,
                picture: profile.photos?.[0]?.value,
                locale: profile._json?.locale || 'en',
            },
        });
    } else {
        // Update profile info on login
        user.profile.name = profile.displayName;
        user.profile.picture = profile.photos?.[0]?.value;
        await user.save();
    }

    return user;
};

/**
 * Get all admins
 */
userSchema.statics.getAdmins = async function () {
    return this.find({ role: 'admin', status: 'active' })
        .select('email profile role')
        .lean();
};

/**
 * Get user statistics (for admin dashboard)
 */
userSchema.statics.getUserStats = async function () {
    const stats = await this.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
            },
        },
    ]);

    const roleStats = await this.aggregate([
        {
            $match: { status: 'active' },
        },
        {
            $group: {
                _id: '$role',
                count: { $sum: 1 },
            },
        },
    ]);

    return {
        byStatus: stats,
        byRole: roleStats,
        total: await this.countDocuments(),
        active: await this.countDocuments({ status: 'active' }),
    };
};

/**
 * Get top users by query count (for admin analytics)
 */
userSchema.statics.getTopUsers = async function (limit = 10) {
    return this.find({ status: 'active' })
        .sort({ 'usage.totalQueries': -1 })
        .limit(limit)
        .select('email profile usage')
        .lean();
};

const User = mongoose.model('User', userSchema);

export default User;
