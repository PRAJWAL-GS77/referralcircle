import * as dashboardService from '../services/dashboard.service.js';

export const getDashboard = async (req, res, next) => {
  try {
    const dashboard = await dashboardService.getDashboardData(req.userId, req.user.settings);
    res.status(200).json({
      data: dashboard
    });
  } catch (error) {
    next(error);
  }
};
