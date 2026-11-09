import * as templateService from '../services/template.service.js';

export const listTemplates = async (req, res, next) => {
  try {
    const templates = await templateService.listTemplates(req.userId);
    res.status(200).json({
      data: templates
    });
  } catch (error) {
    next(error);
  }
};

export const createTemplate = async (req, res, next) => {
  try {
    const template = await templateService.createTemplate(req.userId, req.body);
    res.status(201).json({
      data: template
    });
  } catch (error) {
    next(error);
  }
};

export const getTemplate = async (req, res, next) => {
  try {
    const template = await templateService.getTemplateById(req.userId, req.params.id);
    res.status(200).json({
      data: template
    });
  } catch (error) {
    next(error);
  }
};

export const updateTemplate = async (req, res, next) => {
  try {
    const template = await templateService.updateTemplate(req.userId, req.params.id, req.body);
    res.status(200).json({
      data: template
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTemplate = async (req, res, next) => {
  try {
    await templateService.deleteTemplate(req.userId, req.params.id);
    res.status(200).json({
      data: {
        message: 'Template deleted successfully'
      }
    });
  } catch (error) {
    next(error);
  }
};

export const renderTemplate = async (req, res, next) => {
  try {
    const { contactId } = req.query;
    const rendered = await templateService.renderTemplate(
      req.userId,
      req.params.id,
      contactId,
      req.user
    );
    res.status(200).json({
      data: rendered
    });
  } catch (error) {
    next(error);
  }
};
