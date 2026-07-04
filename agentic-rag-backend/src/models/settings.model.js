import mongoose from 'mongoose';

/**
 * Settings Model
 * 
 * Purpose: Store global application settings.
 * Initially used for Rate Limiting configuration.
 */
const settingsSchema = new mongoose.Schema({
    rateLimit: {
        enabled: {
            type: Boolean,
            default: true,
            description: 'Whether rate limiting is enabled globally'
        },
        type: {
            type: String,
            enum: ['requests', 'tokens'],
            default: 'requests',
            description: 'Type of limit to enforce: "requests" or "tokens"'
        },
        requestLimit: {
            type: Number,
            default: 10,
            description: 'Daily request limit per user'
        },
        tokenLimit: {
            type: Number,
            default: 2000,
            description: 'Daily token limit per user'
        }
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Helper to get or create the singleton settings document
settingsSchema.statics.getSettings = async function () {
    console.log('DEBUG: Settings.getSettings() called');
    try {
        let settings = await this.findOne().exec();
        console.log('DEBUG: findOne result:', settings ? 'Found' : 'Not Found');

        if (!settings) {
            console.log('DEBUG: Creating default settings...');
            settings = await this.create({
                rateLimit: {
                    enabled: true,
                    type: 'requests',
                    requestLimit: 10,
                    tokenLimit: 2000
                }
            });
            console.log('DEBUG: Default settings created');
        }

        console.log('DEBUG: Returning settings');
        return settings;
    } catch (error) {
        console.error('DEBUG: Error in getSettings:', error);
        throw error;
    }
};

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;
