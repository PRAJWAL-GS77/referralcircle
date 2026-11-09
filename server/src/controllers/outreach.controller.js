import * as outreachService from '../services/outreach.service.js';

export const listOutreach = async (req, res, next) => {
  try {
    const list = await outreachService.listContactOutreach(req.userId, req.params.id);
    res.status(200).json({
      data: list
    });
  } catch (error) {
    next(error);
  }
};

export const createOutreach = async (req, res, next) => {
  try {
    const result = await outreachService.createOutreach(
      req.userId,
      req.params.id,
      req.body,
      req.user.settings
    );
    res.status(201).json({
      data: result.outreach,
      meta: {
        contact: result.contact
      }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteOutreach = async (req, res, next) => {
  try {
    const result = await outreachService.deleteOutreach(
      req.userId,
      req.params.id,
      req.user.settings
    );
    res.status(200).json({
      data: {
        message: result.message,
        contact: result.contact
      }
    });
  } catch (error) {
    next(error);
  }
};
