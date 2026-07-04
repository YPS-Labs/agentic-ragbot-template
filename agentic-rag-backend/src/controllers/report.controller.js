import Report from '../models/report.model.js';

/**
 * Submit a new bug report or feedback
 * @route POST /api/reports
 */
export const submitReport = async (req, res) => {
    try {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, email, and message'
            });
        }

        const report = new Report({
            name,
            email,
            message
        });

        await report.save();

        res.status(201).json({
            success: true,
            message: 'Report submitted successfully',
            data: report
        });

    } catch (error) {
        console.error('Error submitting report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit report'
        });
    }
};
