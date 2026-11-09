import * as contactService from '../services/contact.service.js';

export const listContacts = async (req, res, next) => {
  try {
    const result = await contactService.listContacts(req.userId, req.query, req.user.settings);
    res.status(200).json({
      data: result.contacts,
      meta: result.meta
    });
  } catch (error) {
    next(error);
  }
};

export const createContact = async (req, res, next) => {
  try {
    const contact = await contactService.createContact(req.userId, req.body);
    res.status(201).json({
      data: contact
    });
  } catch (error) {
    next(error);
  }
};

export const getContact = async (req, res, next) => {
  try {
    const contact = await contactService.getContactById(req.userId, req.params.id);
    res.status(200).json({
      data: contact
    });
  } catch (error) {
    next(error);
  }
};

export const updateContact = async (req, res, next) => {
  try {
    const contact = await contactService.updateContact(req.userId, req.params.id, req.body, req.user.settings);
    res.status(200).json({
      data: contact
    });
  } catch (error) {
    next(error);
  }
};

export const deleteContact = async (req, res, next) => {
  try {
    await contactService.deleteContact(req.userId, req.params.id);
    res.status(200).json({
      data: {
        message: 'Contact and associated outreach history deleted successfully'
      }
    });
  } catch (error) {
    next(error);
  }
};
