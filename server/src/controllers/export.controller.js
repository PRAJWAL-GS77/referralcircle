import * as exportService from '../services/export.service.js';

export const exportContactsCsv = async (req, res, next) => {
  try {
    const csvData = await exportService.exportContactsToCsv(req.userId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="contacts.csv"');
    res.status(200).send(csvData);
  } catch (error) {
    next(error);
  }
};
