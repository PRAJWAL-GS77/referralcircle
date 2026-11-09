import * as authService from '../services/auth.service.js';

export const googleLogin = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    const { token, user } = await authService.loginWithGoogle(idToken);
    res.status(200).json({
      data: {
        token,
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      data: req.user
    });
  } catch (error) {
    next(error);
  }
};

export const logoutAll = async (req, res, next) => {
  try {
    await authService.logoutAllSessions(req.userId);
    res.status(200).json({
      data: {
        message: 'All sessions successfully invalidated.'
      }
    });
  } catch (error) {
    next(error);
  }
};
