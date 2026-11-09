import { Template } from '../models/template.model.js';
import { Contact } from '../models/contact.model.js';
import { AppError } from '../middleware/error.middleware.js';

export const listTemplates = async (userId) => {
  return Template.find({ userId }).sort('-createdAt').lean();
};

export const createTemplate = async (userId, data) => {
  return Template.create({
    ...data,
    userId
  });
};

export const getTemplateById = async (userId, templateId) => {
  const template = await Template.findOne({ _id: templateId, userId });
  if (!template) {
    throw new AppError('Template not found', 404, 'NOT_FOUND');
  }
  return template;
};

export const updateTemplate = async (userId, templateId, data) => {
  const template = await Template.findOne({ _id: templateId, userId });
  if (!template) {
    throw new AppError('Template not found', 404, 'NOT_FOUND');
  }
  Object.assign(template, data);
  await template.save();
  return template;
};

export const deleteTemplate = async (userId, templateId) => {
  const template = await Template.findOneAndDelete({ _id: templateId, userId });
  if (!template) {
    throw new AppError('Template not found', 404, 'NOT_FOUND');
  }
  return template;
};

export const renderTemplate = async (userId, templateId, contactId, user) => {
  const template = await Template.findOne({ _id: templateId, userId });
  if (!template) {
    throw new AppError('Template not found', 404, 'NOT_FOUND');
  }

  const contact = await Contact.findOne({ _id: contactId, userId });
  if (!contact) {
    throw new AppError('Contact not found', 404, 'NOT_FOUND');
  }

  const replacements = {
    contactName: contact.name || '',
    company: contact.company || '',
    role: contact.role || '',
    myName: user?.name || ''
  };

  let renderedBody = template.body;
  Object.entries(replacements).forEach(([key, val]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    renderedBody = renderedBody.replace(regex, val);
  });

  return {
    templateId: template._id,
    title: template.title,
    kind: template.kind,
    renderedBody,
    contact: {
      id: contact._id,
      name: contact.name,
      company: contact.company,
      role: contact.role
    }
  };
};
