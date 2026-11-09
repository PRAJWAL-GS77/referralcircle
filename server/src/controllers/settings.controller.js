import * as settingsService from '../services/settings.service.js';

export const getSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.getSettings(req.userId);
    res.status(200).json({
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.updateSettings(req.userId, req.body);
    res.status(200).json({
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req, res, next) => {
  try {
    const result = await settingsService.deleteAccount(req.userId);
    res.status(200).json({
      data: result
    });
  } catch (error) {
    next(error);
  }
};
