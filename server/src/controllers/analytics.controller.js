import * as analyticsService from '../services/analytics.service.js';

export const getAnalytics = async (req, res, next) => {
  try {
    const analytics = await analyticsService.getAnalyticsData(req.userId);
    res.status(200).json({
      data: analytics
    });
  } catch (error) {
    next(error);
  }
};
